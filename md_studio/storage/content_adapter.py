import os
import uuid
import aiofiles
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from dataclasses import dataclass, asdict
import frontmatter

from ..utils.excerpt import create_excerpt
from ..utils.safe_fs import ensure_dir, path_exists, atomic_write_file, atomic_write_json, safe_read_json
from ..utils.slug import slugify, ensure_unique_slug

SortBy = Literal["title-asc", "date-newest", "date-oldest", "updated-newest"]
FilterBy = Literal["all", "public", "private"]

@dataclass
class DocMeta:
    title: str
    slug: str
    excerpt: str
    isPublic: bool
    publicId: Optional[str]
    createdAt: str
    updatedAt: str

@dataclass
class DocFull:
    title: str
    slug: str
    excerpt: str
    isPublic: bool
    publicId: Optional[str]
    createdAt: str
    updatedAt: str
    bodyMd: str

class ContentAdapter:
    def __init__(self, content_root: Optional[str] = None, index_path: Optional[str] = None):
        self.content_root = Path(content_root or os.path.join(os.getcwd(), "content"))
        self.index_path = Path(index_path or os.path.join(os.getcwd(), ".md-studio", "index.json"))
        
        self.scan_roots = self._get_scan_roots()
        self.write_root = self._get_write_root()
    
    def _get_scan_roots(self) -> List[Path]:
        scan_dirs = os.getenv("SCAN_DIRS")
        if scan_dirs:
            return [Path(d.strip()) if os.path.isabs(d.strip()) else Path(os.getcwd()) / d.strip() 
                   for d in scan_dirs.split(",") if d.strip()]
        
        content_dirs = os.getenv("CONTENT_DIRS")
        if content_dirs:
            return [Path(d.strip()) if os.path.isabs(d.strip()) else Path(os.getcwd()) / d.strip() 
                   for d in content_dirs.split(",") if d.strip()]
        
        return [self.content_root]
    
    def _get_write_root(self) -> Path:
        write_dir = os.getenv("WRITE_DIR")
        if write_dir:
            dirs = [Path(d.strip()) if os.path.isabs(d.strip()) else Path(os.getcwd()) / d.strip() 
                   for d in write_dir.split(",") if d.strip()]
            if dirs:
                return dirs[0]
        return self.scan_roots[0] if self.scan_roots else self.content_root
    
    async def list(
        self,
        query: str = "",
        page: int = 1,
        page_size: int = 20,
        sort_by: SortBy = "date-newest",
        filter_by: FilterBy = "all"
    ) -> Dict[str, Any]:
        index = await self._read_index()
        normalized_query = query.strip().lower()
        
        if filter_by == "public":
            index = [entry for entry in index if entry.isPublic]
        elif filter_by == "private":
            index = [entry for entry in index if not entry.isPublic]
        
        filtered = index
        if normalized_query:
            filtered = [
                entry for entry in index
                if normalized_query in f"{entry.title} {entry.slug} {entry.excerpt}".lower()
            ]
        
        sorted_items = sorted(filtered, key=lambda x: self._sort_key(x, sort_by))
        
        total = len(sorted_items)
        start = max(0, (page - 1) * page_size)
        end = start + page_size
        items = sorted_items[start:end]
        
        return {
            "items": [asdict(item) for item in items],
            "total": total
        }
    
    def _sort_key(self, item: DocMeta, sort_by: SortBy):
        if sort_by == "title-asc":
            return item.title.lower()
        elif sort_by == "date-oldest":
            return datetime.fromisoformat(item.createdAt)
        elif sort_by == "updated-newest":
            return -datetime.fromisoformat(item.updatedAt).timestamp()
        else:
            return -datetime.fromisoformat(item.createdAt).timestamp()
    
    async def get_by_slug(self, slug: str) -> Optional[Dict[str, Any]]:
        location = await self._find_doc_location(slug)
        if not location:
            return None
        
        async with aiofiles.open(location["path"], 'r', encoding='utf-8') as f:
            content = await f.read()
        
        post = frontmatter.loads(content)
        data = self._normalize_frontmatter(post.metadata, slug)
        
        body_md = post.content.rstrip()
        meta_data = dict(data)
        excerpt = meta_data.pop("excerpt", "") or create_excerpt(body_md)
        meta = DocMeta(
            **meta_data,
            excerpt=excerpt,
        )
        
        result = asdict(meta)
        result["bodyMd"] = body_md
        return result
    
    async def get_by_public_id(self, public_id: str) -> Optional[Dict[str, Any]]:
        index = await self._read_index()
        match = next((entry for entry in index if entry.publicId == public_id), None)
        if not match:
            return None
        
        return await self.get_by_slug(match.slug)
    
    async def create(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        title = input_data["title"].strip()
        body_md = input_data["bodyMd"]
        desired_slug = input_data.get("slug")
        
        slug = await ensure_unique_slug(
            desired_slug,
            title,
            lambda candidate: self._is_slug_available(candidate)
        )
        
        if not slug:
            raise ValueError("Unable to derive slug from title.")
        
        now = datetime.now().isoformat()
        doc_meta = DocMeta(
            title=title,
            slug=slug,
            excerpt=create_excerpt(body_md),
            isPublic=False,
            publicId=None,
            createdAt=now,
            updatedAt=now
        )
        
        await self._write_document_file(self.write_root, doc_meta, body_md)
        await self._persist_index(lambda records: records + [doc_meta])
        
        return asdict(doc_meta)
    
    async def update(self, slug: str, patch: Dict[str, Any]) -> Dict[str, Any]:
        location = await self._find_doc_location(slug)
        if not location:
            raise ValueError(f'Document "{slug}" not found.')
        
        index = await self._read_index()
        target_index = next((i for i, entry in enumerate(index) if entry.slug == slug), -1)
        if target_index == -1:
            raise ValueError(f'Document "{slug}" not found.')
        
        current_meta = index[target_index]
        existing = await self.get_by_slug(slug)
        if not existing:
            raise ValueError(f'Document "{slug}" content missing.')
        
        desired_slug = slugify(patch.get("slug", "")) if patch.get("slug") else current_meta.slug
        if not desired_slug:
            raise ValueError("Updated slug cannot be empty.")
        
        next_slug = desired_slug
        if patch.get("slug") and desired_slug != slug:
            next_slug = await ensure_unique_slug(
                desired_slug,
                current_meta.title,
                lambda candidate: self._is_slug_available(candidate, exclude=slug)
            )
        
        now = datetime.now().isoformat()
        body_md = patch.get("bodyMd", existing["bodyMd"])
        
        is_public = patch.get("isPublic", current_meta.isPublic)
        public_id = current_meta.publicId
        if patch.get("isPublic") is True and not public_id:
            public_id = str(uuid.uuid4())
        elif patch.get("isPublic") is False:
            public_id = None
        
        updated_meta = DocMeta(
            title=patch.get("title", current_meta.title).strip() if patch.get("title") else current_meta.title,
            slug=next_slug,
            isPublic=is_public,
            publicId=public_id,
            excerpt=create_excerpt(body_md),
            createdAt=current_meta.createdAt,
            updatedAt=now
        )
        
        await self._write_document_file(Path(location["root"]), updated_meta, body_md)
        
        if next_slug != slug:
            old_path = self._get_doc_path(Path(location["root"]), slug)
            if await path_exists(old_path):
                os.remove(old_path)
        
        index[target_index] = updated_meta
        await self._write_index(index)
        
        return asdict(updated_meta)
    
    async def remove(self, slug: str) -> None:
        index = await self._read_index()
        next_index = [entry for entry in index if entry.slug != slug]
        if len(next_index) == len(index):
            raise ValueError(f'Document "{slug}" not found.')
        
        location = await self._find_doc_location(slug)
        if location:
            doc_path = self._get_doc_path(Path(location["root"]), slug)
            if await path_exists(doc_path):
                os.remove(doc_path)
        
        await self._write_index(next_index)
    
    async def toggle_public(self, slug: str) -> Dict[str, Any]:
        location = await self._find_doc_location(slug)
        if not location:
            raise ValueError(f'Document "{slug}" not found.')
        
        index = await self._read_index()
        target_index = next((i for i, entry in enumerate(index) if entry.slug == slug), -1)
        if target_index == -1:
            raise ValueError(f'Document "{slug}" not found.')
        
        meta = index[target_index]
        now_public = not meta.isPublic
        
        updated_meta = DocMeta(
            title=meta.title,
            slug=meta.slug,
            excerpt=meta.excerpt,
            isPublic=now_public,
            publicId=meta.publicId or str(uuid.uuid4()) if now_public else None,
            createdAt=meta.createdAt,
            updatedAt=datetime.now().isoformat()
        )
        
        document = await self.get_by_slug(slug)
        if not document:
            raise ValueError(f'Document "{slug}" content missing.')
        
        await self._write_document_file(Path(location["root"]), updated_meta, document["bodyMd"])
        index[target_index] = updated_meta
        await self._write_index(index)
        
        return asdict(updated_meta)
    
    async def export_raw(self, slug: str) -> Dict[str, str]:
        location = await self._find_doc_location(slug)
        if not location:
            raise ValueError(f'Document "{slug}" not found.')
        
        async with aiofiles.open(location["path"], 'r', encoding='utf-8') as f:
            content = await f.read()
        
        return {"filename": f"{slug}.md", "content": content}
    
    def _get_doc_path(self, root: Path, slug: str) -> Path:
        return root / f"{slug}.md"
    
    async def _find_doc_location(self, slug: str) -> Optional[Dict[str, str]]:
        for root in self.scan_roots:
            file_path = self._get_doc_path(root, slug)
            if await path_exists(file_path):
                return {"root": str(root), "path": str(file_path)}
        return None
    
    async def _is_slug_available(self, slug: str, exclude: Optional[str] = None) -> bool:
        if exclude and slug == exclude:
            return True
        
        for root in self.scan_roots:
            if await path_exists(self._get_doc_path(root, slug)):
                return False
        return True
    
    async def _read_index(self) -> List[DocMeta]:
        entries_data = await safe_read_json(self.index_path, [])
        entries = [DocMeta(**entry) for entry in entries_data]
        if entries:
            entries = self._merge_indexes([entries])
        
        index_exists = await path_exists(self.index_path)
        if not index_exists or not entries:
            disk_entries = await self._read_docs_from_scan_roots()
            if disk_entries:
                await self._write_index(disk_entries)
                return disk_entries
        
        return sorted(entries, key=lambda x: -datetime.fromisoformat(x.updatedAt).timestamp())
    
    async def _write_index(self, entries: List[DocMeta]) -> None:
        deduped = self._merge_indexes([entries]) if entries else []
        sorted_entries = sorted(deduped, key=lambda x: -datetime.fromisoformat(x.updatedAt).timestamp())
        await atomic_write_json(self.index_path, [asdict(e) for e in sorted_entries])
    
    async def _persist_index(self, mutator) -> None:
        current = await self._read_index()
        next_entries = mutator(current)
        if next_entries:
            next_entries = self._merge_indexes([next_entries])
        await self._write_index(next_entries)
    
    def _normalize_frontmatter(self, data: Dict[str, Any], slug: str, stats: Optional[Dict] = None) -> Dict[str, Any]:
        fallback_created = stats.get("birthtime", datetime.now()) if stats else datetime.now()
        fallback_updated = stats.get("mtime", datetime.now()) if stats else datetime.now()
        
        return {
            "title": data.get("title", slug),
            "slug": data.get("slug", slug),
            "excerpt": data.get("excerpt", ""),
            "isPublic": bool(data.get("isPublic", False)),
            "publicId": data.get("publicId") if data.get("publicId") else None,
            "createdAt": data.get("createdAt", fallback_created.isoformat() if isinstance(fallback_created, datetime) else fallback_created),
            "updatedAt": data.get("updatedAt", fallback_updated.isoformat() if isinstance(fallback_updated, datetime) else fallback_updated)
        }
    
    async def _write_document_file(self, root: Path, meta: DocMeta, body_md: str) -> None:
        metadata = {
            "title": meta.title,
            "slug": meta.slug,
            "isPublic": meta.isPublic,
            "publicId": meta.publicId,
            "createdAt": meta.createdAt,
            "updatedAt": meta.updatedAt
        }
        
        post = frontmatter.Post(body_md.rstrip() + "\n", **metadata)
        markdown_content = frontmatter.dumps(post)
        
        await ensure_dir(root)
        await atomic_write_file(self._get_doc_path(root, meta.slug), markdown_content)
    
    async def _read_docs_from_disk(self, root: Path) -> List[DocMeta]:
        if not await path_exists(root):
            return []
        
        try:
            entries = os.listdir(root)
        except Exception:
            return []
        
        markdown_files = [entry for entry in entries if entry.endswith(".md")]
        
        docs = []
        for filename in markdown_files:
            slug = filename.replace(".md", "")
            file_path = root / filename
            
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
            
            post = frontmatter.loads(content)
            stats = os.stat(file_path)
            data = self._normalize_frontmatter(
                post.metadata, 
                slug,
                {"birthtime": datetime.fromtimestamp(stats.st_ctime), "mtime": datetime.fromtimestamp(stats.st_mtime)}
            )
            
            body_content = post.content.rstrip()
            meta_data = dict(data)
            excerpt = meta_data.pop("excerpt", "") or create_excerpt(body_content)
            doc_meta = DocMeta(
                **meta_data,
                excerpt=excerpt,
            )
            docs.append(doc_meta)
        
        return docs
    
    async def _read_docs_from_scan_roots(self) -> List[DocMeta]:
        all_docs = []
        for root in self.scan_roots:
            docs = await self._read_docs_from_disk(root)
            all_docs.append(docs)
        
        return self._merge_indexes(all_docs)
    
    def _merge_indexes(self, indexes: List[List[DocMeta]]) -> List[DocMeta]:
        by_slug: Dict[str, DocMeta] = {}
        for entries in indexes:
            for entry in entries:
                existing = by_slug.get(entry.slug)
                if not existing:
                    by_slug[entry.slug] = entry
                    continue
                
                existing_time = datetime.fromisoformat(existing.updatedAt).timestamp()
                entry_time = datetime.fromisoformat(entry.updatedAt).timestamp()
                if entry_time >= existing_time:
                    by_slug[entry.slug] = entry
        
        return list(by_slug.values())
