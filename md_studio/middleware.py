from starlette.applications import Starlette
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles
from pathlib import Path
from typing import Iterable, Optional, Union
import os

from .storage.content_adapter import ContentAdapter
from .api.routes import routes as api_routes
from .utils.frontend import serve_asset, serve_spa


class MDStudio(Starlette):
    def __init__(
        self,
        title: str = "md Studio",
        scan_dirs: Optional[Union[str, Iterable[str]]] = None,
        write_dir: Optional[Union[str, Iterable[str]]] = None,
        uploads_path: Optional[str] = None,
        metadata_path: Optional[str] = None,
        **kwargs
    ):
        if scan_dirs is None and write_dir is None:
            env_scan = os.getenv("MD_STUDIO_SCAN_DIRS") or os.getenv("MD_STUDIO_CONTENT_DIRS")
            env_write = os.getenv("MD_STUDIO_WRITE_DIR")
            if not env_scan and not env_write:
                raise ValueError(
                    "Provide scan_dirs or write_dir (or set MD_STUDIO_SCAN_DIRS/MD_STUDIO_WRITE_DIR) to locate content."
                )

        def _first_path(raw: Optional[Union[str, Iterable[str]]]) -> Optional[str]:
            if raw is None:
                return None
            if isinstance(raw, str):
                parts = [entry.strip() for entry in raw.split(",") if entry.strip()]
                return parts[0] if parts else None
            return next(iter(raw), None)

        resolved_write = _first_path(write_dir) or os.getenv("MD_STUDIO_WRITE_DIR")
        resolved_scan = _first_path(scan_dirs) or os.getenv("MD_STUDIO_SCAN_DIRS") or os.getenv("MD_STUDIO_CONTENT_DIRS")
        uploads_root = uploads_path or resolved_write or resolved_scan
        if uploads_root is None:
            uploads_root = "./uploads"

        self.uploads_path = Path(uploads_root) / "uploads" if uploads_path is None else Path(uploads_root)
        self.title = title
        
        self.uploads_path.mkdir(parents=True, exist_ok=True)
        
        
        routes = api_routes + [
            Route("/assets/{path:path}", serve_asset),
            Mount("/uploads", StaticFiles(directory=str(self.uploads_path)), name="uploads"),
            Route("/{path:path}", serve_spa),
        ]
        
        super().__init__(routes=routes, **kwargs)
        
        default_index_path = Path(self.uploads_path) / ".md-studio-metadata.json"
        self.state.content_adapter = ContentAdapter(
            index_path=metadata_path or str(default_index_path),
            scan_dirs=scan_dirs,
            write_dir=write_dir,
        )
        self.state.uploads_path = str(self.uploads_path)
    
