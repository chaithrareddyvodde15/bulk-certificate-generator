from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RecipientCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Recipient full name")
    email: EmailStr = Field(..., description="Valid recipient email address")
    course: str = Field(..., min_length=1, max_length=200, description="Course or track name")

    @field_validator("name", "course")
    @classmethod
    def strip_and_validate_non_empty(cls, value: str) -> str:
        clean = value.strip()
        if not clean:
            raise ValueError("Field cannot be empty or blank")
        return clean

    @field_validator("email")
    @classmethod
    def lowercase_email(cls, value: EmailStr) -> str:
        return str(value).lower().strip()


class CertificateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    job_id: int
    recipient_name: str
    recipient_email: str
    course: str
    status: str
    download_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
