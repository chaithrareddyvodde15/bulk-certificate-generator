from math import ceil
from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy import String, cast, desc, or_
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Certificate, CertificateStatus, GenerationJob, JobStatus
from app.schemas.certificate import CertificateResponse
from app.schemas.job import (
    JobCreate,
    JobCreateResponse,
    JobDetailResponse,
    JobListItem,
    JobListResponse
)
from app.services.job_processor import process_generation_job

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post(
    "",
    response_model=JobCreateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Create a bulk certificate generation job"
)
def create_job(
    payload: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """
    Submits a bulk certificate generation request.
    Validates payload, creates persistent job and certificate records,
    and enqueues background PDF generation.
    """
    total_recipients = len(payload.recipients)

    # 1. Create GenerationJob record
    new_job = GenerationJob(
        certificate_title=payload.certificate_title,
        event_name=payload.event_name,
        organization_name=payload.organization_name,
        issue_date=payload.issue_date,
        status=JobStatus.PENDING.value,
        total_count=total_recipients,
        success_count=0,
        failure_count=0
    )
    db.add(new_job)
    db.flush()  # Populates new_job.id

    # 2. Create Certificate records for all recipients
    certificate_records = [
        Certificate(
            job_id=new_job.id,
            recipient_name=rec.name,
            recipient_email=rec.email,
            course=rec.course,
            status=CertificateStatus.PENDING.value
        )
        for rec in payload.recipients
    ]
    db.add_all(certificate_records)
    db.commit()
    db.refresh(new_job)

    # 3. Schedule background processing
    background_tasks.add_task(process_generation_job, new_job.id)

    return JobCreateResponse(
        job_id=new_job.id,
        status=new_job.status,
        total=new_job.total_count
    )


@router.get(
    "",
    response_model=JobListResponse,
    summary="List generation jobs with pagination and filters"
)
def list_jobs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status (PENDING, PROCESSING, etc.)"),
    search: Optional[str] = Query(None, description="Search by ID, event name, or organization"),
    db: Session = Depends(get_db)
):
    query = db.query(GenerationJob)

    if status:
        query = query.filter(GenerationJob.status == status.upper().strip())

    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            or_(
                cast(GenerationJob.id, String).like(search_term),
                GenerationJob.event_name.ilike(search_term),
                GenerationJob.organization_name.ilike(search_term),
                GenerationJob.certificate_title.ilike(search_term)
            )
        )

    total_items = query.count()
    total_pages = ceil(total_items / page_size) if total_items > 0 else 1

    jobs = (
        query.order_by(desc(GenerationJob.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for j in jobs:
        completed = j.success_count + j.failure_count
        pct = round((completed / j.total_count) * 100, 1) if j.total_count > 0 else 0.0
        items.append(
            JobListItem(
                id=j.id,
                certificate_title=j.certificate_title,
                event_name=j.event_name,
                organization_name=j.organization_name,
                issue_date=j.issue_date,
                status=j.status,
                total_count=j.total_count,
                success_count=j.success_count,
                failure_count=j.failure_count,
                progress_percentage=pct,
                created_at=j.created_at,
                completed_at=j.completed_at
            )
        )

    return JobListResponse(
        items=items,
        total=total_items,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get(
    "/{job_id}",
    response_model=JobDetailResponse,
    summary="Get job status and progress details"
)
def get_job(job_id: int, db: Session = Depends(get_db)):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found"
        )

    completed = job.success_count + job.failure_count
    pending = max(0, job.total_count - completed)
    progress_pct = round((completed / job.total_count) * 100, 1) if job.total_count > 0 else 0.0

    return JobDetailResponse(
        job_id=job.id,
        certificate_title=job.certificate_title,
        event_name=job.event_name,
        organization_name=job.organization_name,
        issue_date=job.issue_date,
        status=job.status,
        total=job.total_count,
        successful=job.success_count,
        failed=job.failure_count,
        completed=completed,
        pending=pending,
        progress_percentage=progress_pct,
        created_at=job.created_at,
        completed_at=job.completed_at
    )


@router.get(
    "/{job_id}/certificates",
    response_model=List[CertificateResponse],
    summary="List all certificates associated with a job"
)
def get_job_certificates(job_id: int, db: Session = Depends(get_db)):
    job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found"
        )

    certificates = (
        db.query(Certificate)
        .filter(Certificate.job_id == job_id)
        .order_by(Certificate.id)
        .all()
    )

    result = []
    for cert in certificates:
        download_url = (
            f"/api/certificates/{cert.id}"
            if cert.status == CertificateStatus.SUCCESS.value
            else None
        )
        result.append(
            CertificateResponse(
                id=cert.id,
                job_id=cert.job_id,
                recipient_name=cert.recipient_name,
                recipient_email=cert.recipient_email,
                course=cert.course,
                status=cert.status,
                download_url=download_url,
                error_message=cert.error_message,
                created_at=cert.created_at
            )
        )

    return result
