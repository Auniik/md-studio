from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

class CreateDocumentSchema(BaseModel):
    title: str = Field(..., min_length=1)
    slug: Optional[str] = None
    bodyMd: str = Field(..., min_length=1)

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Title is required.")
        return value

    @field_validator("bodyMd")
    @classmethod
    def validate_body(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError("Body is required.")
        return value

class UpdateDocumentSchema(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    bodyMd: Optional[str] = None
    isPublic: Optional[bool] = None
