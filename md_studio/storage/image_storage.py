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

class S3ImageStorage(ImageStorageAdapter):
    def __init__(self):
        self.bucket = os.getenv("S3_BUCKET")
        self.region = os.getenv("S3_REGION")
        
        if not self.bucket or not self.region:
            raise ValueError("S3_BUCKET and S3_REGION must be provided for S3 uploads.")
        
        self.base_path = os.getenv("S3_BASE_PREFIX", "uploads")
        self.access_key = os.getenv("S3_ACCESS_KEY_ID")
        self.secret_key = os.getenv("S3_SECRET_ACCESS_KEY")
        
        try:
            import boto3
            credentials = {}
            if self.access_key:
                credentials = {
                    "aws_access_key_id": self.access_key,
                    "aws_secret_access_key": self.secret_key
                }
            
            self.client = boto3.client("s3", region_name=self.region, **credentials)
        except ImportError:
            raise ImportError("boto3 is required for S3 storage. Install with: pip install boto3")
    
    async def upload_image(self, file_content: bytes, filename: str, content_type: str) -> Dict[str, str]:
        if len(file_content) > MAX_IMAGE_FILE_SIZE:
            raise ValueError("File exceeds 5MB limit.")
        
        if content_type not in ALLOWED_IMAGE_MIME_TYPES:
            raise ValueError(f"Unsupported file type: {content_type}")
        
        extension = ALLOWED_IMAGE_MIME_TYPES[content_type]
        key = f"{self.base_path}/{uuid.uuid4()}{extension}"
        
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=file_content,
            ContentType=content_type,
            ACL="public-read"
        )
        
        endpoint = os.getenv("S3_PUBLIC_URL") or f"https://{self.bucket}.s3.{self.region}.amazonaws.com"
        
        return {
            "url": f"{endpoint}/{key}"
        }

_cached_storage: Optional[ImageStorageAdapter] = None

def get_image_storage_adapter(base_path: str = "") -> ImageStorageAdapter:
    global _cached_storage
    
    if _cached_storage:
        return _cached_storage
    
    mode = os.getenv("STORAGE_ADAPTER", "fs").lower()
    _cached_storage = S3ImageStorage() if mode == "s3" else LocalImageStorage(base_path=base_path)
    return _cached_storage
