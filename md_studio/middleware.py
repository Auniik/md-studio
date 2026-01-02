from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse, HTMLResponse, Response
from pathlib import Path
import os
import re

from .storage.content_adapter import ContentAdapter
from .api.routes import routes as api_routes

class MarkdownStudioMiddleware(Starlette):
    def __init__(
        self,
        storage_path: str = "./content",
        uploads_path: str = "./uploads",
        storage_backend: str = "filesystem",
        title: str = "MD Studio",
        allow_upload: bool = True,
        allow_import_export: bool = True,
        max_upload_size: int = 10 * 1024 * 1024,
        s3_config: dict = None,
        base_path: str = "/",
        **kwargs
    ):
        self.storage_path = Path(storage_path)
        self.uploads_path = Path(uploads_path)
        self.storage_backend = storage_backend
        self.title = title
        self.allow_upload = allow_upload
        self.allow_import_export = allow_import_export
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
        
        self.state.content_adapter = ContentAdapter(
            content_root=str(self.storage_path),
            index_path=str(Path(os.getcwd()) / ".md-studio" / "index.json")
        )
        self.state.base_path = self.base_path
    
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
