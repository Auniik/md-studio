from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse, HTMLResponse, Response
from pathlib import Path
from typing import Iterable, Optional, Union
import os
import re

from .storage.content_adapter import ContentAdapter
from .api.routes import routes as api_routes

class MarkdownStudioMiddleware(Starlette):
    def __init__(
        self,
        storage_path: Optional[str] = None,
        uploads_path: Optional[str] = None,
        storage_backend: str = "filesystem",
        title: str = "MD Studio",
        max_upload_size: int = 10 * 1024 * 1024,
        s3_config: dict = None,
        base_path: str = "/",
        scan_dirs: Optional[Union[str, Iterable[str]]] = None,
        write_dir: Optional[Union[str, Iterable[str]]] = None,
        metadata_path: Optional[str] = None,
        **kwargs
    ):
        if storage_path is None and scan_dirs is None and write_dir is None:
            env_scan = os.getenv("SCAN_DIRS") or os.getenv("CONTENT_DIRS")
            env_write = os.getenv("WRITE_DIR")
            if not env_scan and not env_write:
                raise ValueError(
                    "Provide scan_dirs or write_dir (or set SCAN_DIRS/WRITE_DIR) to locate content."
                )

        content_root = storage_path
        if content_root is None and write_dir is not None:
            content_root = next(iter(write_dir), None) if isinstance(write_dir, Iterable) and not isinstance(write_dir, str) else write_dir
        if content_root is None and scan_dirs is not None:
            content_root = next(iter(scan_dirs), None) if isinstance(scan_dirs, Iterable) and not isinstance(scan_dirs, str) else scan_dirs
        if content_root is None:
            content_root = "./content"

        def _first_path(raw: Optional[Union[str, Iterable[str]]]) -> Optional[str]:
            if raw is None:
                return None
            if isinstance(raw, str):
                parts = [entry.strip() for entry in raw.split(",") if entry.strip()]
                return parts[0] if parts else None
            return next(iter(raw), None)

        resolved_write = _first_path(write_dir) or os.getenv("WRITE_DIR")
        resolved_scan = _first_path(scan_dirs) or os.getenv("SCAN_DIRS") or os.getenv("CONTENT_DIRS")
        uploads_root = uploads_path or resolved_write or resolved_scan
        if uploads_root is None:
            uploads_root = "./uploads"

        self.storage_path = Path(content_root)
        self.uploads_path = Path(uploads_root) / "uploads" if uploads_path is None else Path(uploads_root)
        self.storage_backend = storage_backend
        self.title = title
        self.max_upload_size = max_upload_size
        self.s3_config = s3_config or {}
        self.base_path = self._normalize_base_path(base_path)
        
        self.storage_path.mkdir(parents=True, exist_ok=True)
        self.uploads_path.mkdir(parents=True, exist_ok=True)
        
        static_dir = Path(__file__).parent / "static"
        
        routes = api_routes + [
            Route("/assets/{path:path}", self.serve_asset),
            Mount("/uploads", StaticFiles(directory=str(self.uploads_path)), name="uploads"),
            Route("/{path:path}", self.serve_spa),
        ]
        
        super().__init__(routes=routes, **kwargs)
        
        default_index_path = Path(self.uploads_path) / ".md-studio-metadata.json"
        self.state.content_adapter = ContentAdapter(
            content_root=str(self.storage_path),
            index_path=metadata_path or str(default_index_path),
            scan_dirs=scan_dirs,
            write_dir=write_dir,
        )
        self.state.base_path = self.base_path
        self.state.uploads_path = str(self.uploads_path)
    
    async def serve_spa(self, request):
        static_dir = Path(__file__).parent / "static"
        path = request.path_params.get("path", "")
        
        # Serve static files if they exist
        if path and not path.endswith("/"):
            file_path = static_dir / path
            if file_path.exists() and file_path.is_file():
                return FileResponse(file_path)
        
        # For all other routes (including root), serve index.html for SPA routing
        html_path = static_dir / "index.html"
        with open(html_path, 'r', encoding='utf-8') as f:
            html_content = f.read()

        html_content = self._replace_base_path(html_content, self._get_effective_base_path(request))
        return HTMLResponse(html_content)

    async def serve_asset(self, request):
        static_dir = Path(__file__).parent / "static"
        asset_path = request.path_params.get("path", "")
        file_path = static_dir / "assets" / asset_path

        if not file_path.exists() or not file_path.is_file():
            return Response(status_code=404)

        if file_path.suffix in {".js", ".css", ".map", ".json", ".html"}:
            content = file_path.read_text(encoding="utf-8")
            content = self._replace_base_path(content, self._get_effective_base_path(request))
            media_type = "application/javascript"
            if file_path.suffix == ".css":
                media_type = "text/css"
            elif file_path.suffix == ".map" or file_path.suffix == ".json":
                media_type = "application/json"
            elif file_path.suffix == ".html":
                media_type = "text/html"
            return Response(content, media_type=media_type)

        return FileResponse(file_path)
    

    def _get_effective_base_path(self, request) -> str:
        if self.base_path:
            return self.base_path
        root_path = request.scope.get("root_path", "") or ""
        return self._normalize_base_path(root_path)

    def _replace_base_path(self, content: str, base_path: str) -> str:
        base_segment = base_path.lstrip("/")
        if base_segment:
            return content.replace("__BASE_PATH__", base_segment)
        content = content.replace("/__BASE_PATH__/", "/")
        content = content.replace("/__BASE_PATH__", "/")
        return content.replace("__BASE_PATH__", "")

    def _normalize_base_path(self, raw: str) -> str:
        if not raw:
            return ""
        trimmed = raw.strip()
        if not trimmed or trimmed == "/":
            return ""
        cleaned = re.sub(r"^/+|/+$", "", trimmed)
        return f"/{cleaned}" if cleaned else ""
