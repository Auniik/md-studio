from pydantic import BaseModel, Field, field_validator
from typing import Optional, List

MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024

ALLOWED_IMAGE_MIME_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

class CreateDocumentSchema(BaseModel):
    title: str = Field(..., min_length=1)
    slug: Optional[str] = None
    bodyMd: str = Field(..., min_length=1)
    
    @field_validator('title')
    @classmethod
    def validate_title(cls, v):
        if not v or not v.strip():
            raise ValueError("Title is required.")
        return v
    
    @field_validator('bodyMd')
    @classmethod
    def validate_body(cls, v):
        if not v or not v.strip():
            raise ValueError("Body is required.")
        return v

class UpdateDocumentSchema(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    bodyMd: Optional[str] = None
    isPublic: Optional[bool] = None

class ImportDocumentSchema(BaseModel):
    title: Optional[str] = None

class ImportMultipleDocumentsSchema(BaseModel):
    slugs: Optional[List[str]] = None
    replace: Optional[List[bool]] = None

class UploadSchema(BaseModel):
    pass
