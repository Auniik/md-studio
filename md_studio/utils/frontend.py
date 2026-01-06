import os
import re
from pathlib import Path

from starlette.responses import FileResponse, HTMLResponse, Response


def _static_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "static"


def _normalize_base_path(raw: str) -> str:
    if not raw:
        return ""
    trimmed = raw.strip()
    if not trimmed or trimmed == "/":
        return ""
    cleaned = re.sub(r"^/+|/+$", "", trimmed)
    return f"/{cleaned}" if cleaned else ""


def _get_effective_base_path(request) -> str:
    root_path = request.scope.get("root_path", "") or ""
    return _normalize_base_path(root_path)


def _replace_base_path(content: str, base_path: str) -> str:
    base_segment = base_path.lstrip("/")
    if base_segment:
        return content.replace("__BASE_PATH__", base_segment)
    content = content.replace("/__BASE_PATH__/", "/")
    content = content.replace("/__BASE_PATH__", "/")
    return content.replace("__BASE_PATH__", "")


def _normalize_api_path(raw: str) -> str:
    if not raw:
        return "/api"
    trimmed = raw.strip()
    if not trimmed:
        return "/api"
    cleaned = re.sub(r"^/+|/+$", "", trimmed)
    return f"/{cleaned}" if cleaned else "/api"


def _get_effective_api_path() -> str:
    return _normalize_api_path(os.getenv("MD_STUDIO_API_PATH", "/md/api"))


def _replace_api_path(content: str, api_path: str) -> str:
    if "__API_PATH__" in content:
        return content.replace("__API_PATH__", api_path)
    return content


async def serve_spa(request):
    static_dir = _static_dir()
    path = request.path_params.get("path", "")

    if path and not path.endswith("/"):
        file_path = static_dir / path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)

    html_path = static_dir / "index.html"
    with open(html_path, "r", encoding="utf-8") as f:
        html_content = f.read()

    html_content = _replace_base_path(html_content, _get_effective_base_path(request))
    html_content = _replace_api_path(html_content, _get_effective_api_path())
    return HTMLResponse(html_content)


async def serve_asset(request):
    static_dir = _static_dir()
    asset_path = request.path_params.get("path", "")
    file_path = static_dir / "assets" / asset_path

    if not file_path.exists() or not file_path.is_file():
        return Response(status_code=404)

    if file_path.suffix in {".js", ".css", ".map", ".json", ".html"}:
        content = file_path.read_text(encoding="utf-8")
        content = _replace_base_path(content, _get_effective_base_path(request))
        content = _replace_api_path(content, _get_effective_api_path())
        media_type = "application/javascript"
        if file_path.suffix == ".css":
            media_type = "text/css"
        elif file_path.suffix in {".map", ".json"}:
            media_type = "application/json"
        elif file_path.suffix == ".html":
            media_type = "text/html"
        
        # Add cache headers for static assets
        headers = {
            "Cache-Control": "public, max-age=31536000, immutable"
        }
        return Response(content, media_type=media_type, headers=headers)

    return FileResponse(file_path)
