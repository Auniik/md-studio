from starlette.applications import Starlette
from starlette.middleware import Middleware
from starlette.routing import Mount, Route
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse, HTMLResponse
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
            Mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets"),
            Mount("/uploads", StaticFiles(directory=str(self.uploads_path)), name="uploads"),
            Route("/{path:path}", self.serve_spa),
        ]
        
        super().__init__(routes=routes, **kwargs)
        
        self.state.content_adapter = ContentAdapter(
            content_root=str(self.storage_path),
            index_path=str(Path(os.getcwd()) / ".md-studio" / "index.json")
        )
        self.state.base_path = base_path
    
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
        
        # Only inject window.ENV for runtime configuration
        env_script = f'''<script>
    window.ENV = {{
      BASE_PATH: "{self.base_path}",
      DASHBOARD_PATH: "/",
      SHARE_BASE_URL: "{self.base_path}"
    }};
  </script>'''

        # Ensure Remix uses the correct basename when mounted under a prefix.
        if '"basename":' in html_content:
            html_content = re.sub(
                r'"basename"\s*:\s*"[^"]*"',
                f'"basename":"{self.base_path or "/"}"',
                html_content,
                count=1,
            )
        
        # Inject before the closing </head> tag
        html_content = html_content.replace('</head>', f'{env_script}</head>')
        
        return HTMLResponse(html_content)
    
    def _generate_index_html(self):
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{self.title}</title>
  <script>
    window.ENV = {{
      BASE_PATH: "{self.base_path}",
      DASHBOARD_PATH: "{self.base_path}/",
      SHARE_BASE_URL: "{self.base_path}"
    }};
  </script>
  <script>
    (function() {{
      var theme = localStorage.getItem('md-studio-theme') || 'system';
      var resolved = theme;
      if (theme === 'system') {{
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }}
      document.documentElement.classList.add(resolved);
    }})();
  </script>
</head>
<body>
  <div id="root"></div>
</body>
</html>'''

    def _normalize_base_path(self, raw: str) -> str:
        if not raw:
            return ""
        trimmed = raw.strip()
        if not trimmed or trimmed == "/":
            return ""
        cleaned = re.sub(r"^/+|/+$", "", trimmed)
        return f"/{cleaned}" if cleaned else ""
