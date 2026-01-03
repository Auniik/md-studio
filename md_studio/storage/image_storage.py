import os
import uuid
import aiofiles
from pathlib import Path
from typing import Dict, Optional
from abc import ABC, abstractmethod

from ..utils.slug import slugify
from ..utils.safe_fs import ensure_dir, path_exists, atomic_write_file

MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_IMAGE_MIME_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

class ImageStorageAdapter(ABC):
    @abstractmethod
    async def upload_image(self, file_content: bytes, filename: str, content_type: str) -> Dict[str, str]:
        pass

class LocalImageStorage(ImageStorageAdapter):
    def __init__(self, upload_dir: Optional[str] = None, base_path: str = ""):
        self.upload_dir = Path(upload_dir or os.path.join(os.getcwd(), "public", "uploads"))
        self.base_path = base_path
    
    async def upload_image(self, file_content: bytes, filename: str, content_type: str) -> Dict[str, str]:
        if len(file_content) > MAX_IMAGE_FILE_SIZE:
            raise ValueError("File exceeds 5MB limit.")
        
        if content_type not in ALLOWED_IMAGE_MIME_TYPES:
            raise ValueError(f"Unsupported file type: {content_type}")
        
        base_name = slugify(Path(filename).stem) or str(uuid.uuid4())
        extension = ALLOWED_IMAGE_MIME_TYPES[content_type]
        candidate = f"{base_name}{extension}"
        counter = 1
        
        await ensure_dir(self.upload_dir)
        while await path_exists(self.upload_dir / candidate):
            candidate = f"{base_name}-{counter}{extension}"
            counter += 1
        
        await atomic_write_file(self.upload_dir / candidate, file_content)
        
        url = f"{self.base_path}/uploads/{candidate}" if self.base_path else f"/uploads/{candidate}"
        return {
            "url": url,
            "alt": base_name.replace("-", " ")
        }

_cached_storage: Optional[ImageStorageAdapter] = None
_cached_storage_key: Optional[tuple] = None

def get_image_storage_adapter(base_path: str = "", upload_dir: Optional[str] = None) -> ImageStorageAdapter:
    global _cached_storage
    global _cached_storage_key
    
    if _cached_storage:
        if _cached_storage_key == (base_path, upload_dir):
            return _cached_storage
    
    _cached_storage = LocalImageStorage(upload_dir=upload_dir, base_path=base_path)
    _cached_storage_key = (base_path, upload_dir)
    return _cached_storage
