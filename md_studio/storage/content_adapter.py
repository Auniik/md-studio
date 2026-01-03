import os
import uuid
import aiofiles
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal, Iterable, Union
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
    fileMtime: Optional[float] = None

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
    def __init__(
        self,
        index_path: Optional[str] = None,
        scan_dirs: Optional[Union[str, Iterable[str]]] = None,
        write_dir: Optional[Union[str, Iterable[str]]] = None,
    ):
        self.scan_dirs_override = scan_dirs
        self.write_dir_override = write_dir

        if scan_dirs is None and write_dir is None:
            env_scan = os.getenv("MD_STUDIO_SCAN_DIRS") or os.getenv("MD_STUDIO_CONTENT_DIRS")
            env_write = os.getenv("MD_STUDIO_WRITE_DIR")
            if not env_scan and not env_write:
                raise ValueError(
                    "Provide scan_dirs or write_dir (or set MD_STUDIO_SCAN_DIRS/MD_STUDIO_WRITE_DIR) to locate content."
                )

        self.index_path = Path(index_path or os.path.join(os.getcwd(), ".md-studio", "index.json"))
        
        self.scan_roots = self._get_scan_roots()
        self.write_root = self._get_write_root()
        self.roots = self._get_roots()
    
    def _normalize_roots(self, raw: Optional[Union[str, Iterable[str]]]) -> List[Path]:
        if not raw:
            return []
        if isinstance(raw, str):
            entries = [entry.strip() for entry in raw.split(",") if entry.strip()]
        else:
            entries = [str(entry).strip() for entry in raw if str(entry).strip()]
        return [
            Path(entry) if os.path.isabs(entry) else Path(os.getcwd()) / entry
            for entry in entries
        ]

    def _get_scan_roots(self) -> List[Path]:
        if self.scan_dirs_override is not None:
            roots = self._normalize_roots(self.scan_dirs_override)
            if roots:
                return roots
        scan_dirs = os.getenv("MD_STUDIO_SCAN_DIRS")
        if scan_dirs:
            return self._normalize_roots(scan_dirs)
        
        content_dirs = os.getenv("MD_STUDIO_CONTENT_DIRS")
        if content_dirs:
            return self._normalize_roots(content_dirs)
        
        return []
    
    def _get_write_root(self) -> Path:
        if self.write_dir_override is not None:
            dirs = self._normalize_roots(self.write_dir_override)
            if dirs:
                return dirs[0]
        write_dir = os.getenv("MD_STUDIO_WRITE_DIR")
        if write_dir:
            dirs = self._normalize_roots(write_dir)
            if dirs:
                return dirs[0]
        if self.scan_roots:
            return self.scan_roots[0]
        raise ValueError(
            "Provide scan_dirs or write_dir (or set MD_STUDIO_SCAN_DIRS/MD_STUDIO_WRITE_DIR) to locate content."
        )

    def _get_roots(self) -> List[Path]:
        roots: List[Path] = []
        for root in self.scan_roots + [self.write_root]:
            if root not in roots:
                roots.append(root)
        return roots
    
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
        try:
            stats = os.stat(self._get_doc_path(self.write_root, slug))
            doc_meta.fileMtime = stats.st_mtime
        except Exception:
            pass
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
        try:
            stats = os.stat(self._get_doc_path(Path(location["root"]), next_slug))
            updated_meta.fileMtime = stats.st_mtime
        except Exception:
            pass
        
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
            publicId=meta.publicId or str(uuid.uuid4()),
            createdAt=meta.createdAt,
            updatedAt=datetime.now().isoformat()
        )
        
        document = await self.get_by_slug(slug)
        if not document:
            raise ValueError(f'Document "{slug}" content missing.')
        
        await self._write_document_file(Path(location["root"]), updated_meta, document["bodyMd"])
        try:
            stats = os.stat(self._get_doc_path(Path(location["root"]), slug))
            updated_meta.fileMtime = stats.st_mtime
        except Exception:
            pass
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
        for root in self.roots:
            file_path = self._get_doc_path(root, slug)
            if await path_exists(file_path):
                return {"root": str(root), "path": str(file_path)}
        return None
    
    async def _is_slug_available(self, slug: str, exclude: Optional[str] = None) -> bool:
        if exclude and slug == exclude:
            return True
        
        for root in self.roots:
            if await path_exists(self._get_doc_path(root, slug)):
                return False
        return True
    
    async def _read_index(self) -> List[DocMeta]:
        entries_data = await safe_read_json(self.index_path, [])
        entries = [DocMeta(**entry) for entry in entries_data]
        if entries:
            entries = self._merge_indexes([entries])

        existing_by_slug = {entry.slug: entry for entry in entries}
        files_by_slug = await self._collect_md_files()
        if not files_by_slug:
            if entries:
                await self._write_index([])
            return []

        disk_entries = await self._read_docs_from_scan_roots(existing_by_slug, files_by_slug)
        for entry in disk_entries:
            if not entry.publicId:
                entry.publicId = str(uuid.uuid4())

        if not self._indexes_equal(entries, disk_entries):
            await self._write_index(disk_entries)
            return sorted(disk_entries, key=lambda x: -datetime.fromisoformat(x.updatedAt).timestamp())

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
    
    async def _collect_md_files(self) -> Dict[str, Dict[str, Any]]:
        files: Dict[str, Dict[str, Any]] = {}
        for root in self.roots:
            if not await path_exists(root):
                continue
            try:
                entries = os.listdir(root)
            except Exception:
                continue
            for filename in entries:
                if not filename.endswith(".md"):
                    continue
                slug = filename.replace(".md", "")
                file_path = root / filename
                try:
                    stats = os.stat(file_path)
                except Exception:
                    continue
                mtime = stats.st_mtime
                existing = files.get(slug)
                if not existing or mtime >= existing["mtime"]:
                    files[slug] = {"path": file_path, "mtime": mtime, "stats": stats}
        return files

    async def _read_doc_from_path(self, slug: str, file_path: Path, stats: os.stat_result) -> DocMeta:
        async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
            content = await f.read()

        post = frontmatter.loads(content)
        data = self._normalize_frontmatter(
            post.metadata,
            slug,
            {"birthtime": datetime.fromtimestamp(stats.st_ctime), "mtime": datetime.fromtimestamp(stats.st_mtime)}
        )

        body_content = post.content.rstrip()
        meta_data = dict(data)
        excerpt = meta_data.pop("excerpt", "") or create_excerpt(body_content)
        return DocMeta(
            **meta_data,
            excerpt=excerpt,
            fileMtime=stats.st_mtime,
        )

    async def _read_docs_from_scan_roots(
        self,
        existing_by_slug: Dict[str, DocMeta],
        files_by_slug: Dict[str, Dict[str, Any]],
    ) -> List[DocMeta]:
        docs: List[DocMeta] = []
        for slug, info in files_by_slug.items():
            existing = existing_by_slug.get(slug)
            if existing and existing.fileMtime is not None and info["mtime"] <= existing.fileMtime:
                docs.append(existing)
                continue

            doc_meta = await self._read_doc_from_path(slug, info["path"], info["stats"])
            if existing and existing.publicId and not doc_meta.publicId:
                doc_meta.publicId = existing.publicId
            docs.append(doc_meta)

        return docs
    
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

    def _indexes_equal(self, left: List[DocMeta], right: List[DocMeta]) -> bool:
        if len(left) != len(right):
            return False
        left_sorted = sorted(left, key=lambda item: item.slug)
        right_sorted = sorted(right, key=lambda item: item.slug)
        for left_item, right_item in zip(left_sorted, right_sorted):
            if left_item.slug != right_item.slug:
                return False
            if (
                left_item.title != right_item.title
                or left_item.excerpt != right_item.excerpt
                or left_item.isPublic != right_item.isPublic
                or left_item.publicId != right_item.publicId
                or left_item.createdAt != right_item.createdAt
                or left_item.updatedAt != right_item.updatedAt
                or left_item.fileMtime != right_item.fileMtime
            ):
                return False
        return True
