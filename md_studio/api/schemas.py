from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class CreateDocumentSchema(BaseModel):
    title: str = Field(..., min_length=1)
    slug: Optional[str] = None
    bodyMd: str = Field(default="")

class UpdateDocumentSchema(BaseModel):
    title: str = Field(..., min_length=1)
    bodyMd: str = Field(default="")

class DocMeta(BaseModel):
    slug: str
    title: str
    excerpt: str = ""
    createdAt: datetime
    updatedAt: datetime
    isPublic: bool = False
    publicId: Optional[str] = None
    bodyMd: str = ""
