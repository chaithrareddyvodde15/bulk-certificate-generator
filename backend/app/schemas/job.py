from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.schemas.certificate import RecipientCreate


class JobCreate(BaseModel):
    certificate_title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Title of the certificate, e.g. Certificate of Participation"
    )
    event_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Event or workshop name"
    )
    organization_name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Issuing organization name"
    )
    issue_date: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Date of issuance (e.g. YYYY-MM-DD)"
    )
    recipients: List[RecipientCreate] = Field(
        ...,
        min_length=1,
        description="List of recipients to generate certificates for"
    )

    @field_validator("certificate_title", "event_name", "organization_name", "issue_date")
    @classmethod
    def validate_non_blank(cls, value: str) -> str:
        clean = value.strip()
        if not clean:
            raise ValueError("Field cannot be empty or blank")
        return clean

    @field_validator("issue_date")
    @classmethod
    def validate_issue_date(cls, value: str) -> str:
        clean = value.strip()
        # Accept YYYY-MM-DD or parseable dates
        try:
            date.fromisoformat(clean)
        except ValueError:
            # Also allow other common formats, or ensure it's a valid date
            try:
                datetime.strptime(clean, "%Y-%m-%d")
            except ValueError:
                raise ValueError("issue_date must be in valid format (YYYY-MM-DD)")
        return clean

    @field_validator("recipients")
    @classmethod
    def validate_recipient_count(cls, value: List[RecipientCreate]) -> List[RecipientCreate]:
        if not value or len(value) == 0:
            raise ValueError("Recipients list cannot be empty")
        if len(value) > 500:
            raise ValueError("Recipients list exceeds maximum allowable limit of 500")
        return value


class JobCreateResponse(BaseModel):
    job_id: int
    status: str
    total: int


class JobDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: int
    certificate_title: str
    event_name: str
    organization_name: str
    issue_date: str
    status: str
    total: int
    successful: int
    failed: int
    completed: int
    pending: int
    progress_percentage: float
    created_at: datetime
    completed_at: Optional[datetime] = None


class JobListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    certificate_title: str
    event_name: str
    organization_name: str
    issue_date: str
    status: str
    total_count: int
    success_count: int
    failure_count: int
    progress_percentage: float
    created_at: datetime
    completed_at: Optional[datetime] = None


class JobListResponse(BaseModel):
    items: List[JobListItem]
    total: int
    page: int
    page_size: int
    total_pages: int
