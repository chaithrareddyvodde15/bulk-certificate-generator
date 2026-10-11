import enum
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
    Index
)
from sqlalchemy.orm import relationship
from app.db.database import Base


def get_utc_now():
    return datetime.now(timezone.utc)


class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    COMPLETED_WITH_ERRORS = "COMPLETED_WITH_ERRORS"
    FAILED = "FAILED"


class CertificateStatus(str, enum.Enum):
    PENDING = "PENDING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"


class GenerationJob(Base):
    __tablename__ = "generation_jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    certificate_title = Column(String(255), nullable=False)
    event_name = Column(String(255), nullable=False, index=True)
    organization_name = Column(String(255), nullable=False, index=True)
    issue_date = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False, default=JobStatus.PENDING.value, index=True)
    total_count = Column(Integer, nullable=False, default=0)
    success_count = Column(Integer, nullable=False, default=0)
    failure_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=get_utc_now, index=True)
    completed_at = Column(DateTime, nullable=True)

    certificates = relationship(
        "Certificate",
        back_populates="job",
        cascade="all, delete-orphan",
        order_by="Certificate.id"
    )

    __table_args__ = (
        Index("ix_generation_jobs_status_created", "status", "created_at"),
    )


class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(
        Integer,
        ForeignKey("generation_jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    recipient_name = Column(String(255), nullable=False)
    recipient_email = Column(String(255), nullable=False, index=True)
    course = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default=CertificateStatus.PENDING.value, index=True)
    file_path = Column(String(500), nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=get_utc_now)

    job = relationship("GenerationJob", back_populates="certificates")

    __table_args__ = (
        Index("ix_certificates_job_status", "job_id", "status"),
    )
