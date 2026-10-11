import logging
from datetime import datetime, timezone
from app.db.database import SessionLocal
from app.db.models import Certificate, CertificateStatus, GenerationJob, JobStatus
from app.services.certificate_generator import generate_certificate_pdf

logger = logging.getLogger("bulk_certificate_generator.job_processor")


def process_generation_job(job_id: int) -> None:
    """
    Background worker function that executes certificate generation for a job.
    Uses a fresh database session to prevent lifecycle issues after HTTP response completion.
    Isolates recipient generation errors so failures do not halt remaining recipients.
    """
    db = SessionLocal()
    try:
        job = db.query(GenerationJob).filter(GenerationJob.id == job_id).first()
        if not job:
            logger.error(f"Job with ID {job_id} not found for background execution.")
            return

        # Transition job status to PROCESSING
        job.status = JobStatus.PROCESSING.value
        db.commit()

        # Fetch certificates for this job
        certificates = db.query(Certificate).filter(Certificate.job_id == job_id).order_by(Certificate.id).all()

        for cert in certificates:
            try:
                # Generate PDF for individual recipient
                pdf_filename = generate_certificate_pdf(
                    certificate_id=cert.id,
                    recipient_name=cert.recipient_name,
                    recipient_email=cert.recipient_email,
                    course_name=cert.course,
                    certificate_title=job.certificate_title,
                    event_name=job.event_name,
                    organization_name=job.organization_name,
                    issue_date=job.issue_date
                )

                cert.status = CertificateStatus.SUCCESS.value
                cert.file_path = pdf_filename
                cert.error_message = None
                job.success_count += 1

            except Exception as e:
                logger.warning(f"Error generating certificate ID {cert.id}: {e}")
                cert.status = CertificateStatus.FAILED.value
                cert.file_path = None
                # Clean, user-safe error message without sensitive stack traces
                cert.error_message = f"Certificate generation failed: {str(e)[:180]}"
                job.failure_count += 1

            # Commit after each recipient so polling progress displays immediate incremental updates
            db.commit()

        # Calculate final job status
        if job.total_count == 0:
            job.status = JobStatus.COMPLETED.value
        elif job.success_count == job.total_count:
            job.status = JobStatus.COMPLETED.value
        elif job.failure_count == job.total_count:
            job.status = JobStatus.FAILED.value
        else:
            job.status = JobStatus.COMPLETED_WITH_ERRORS.value

        job.completed_at = datetime.now(timezone.utc)
        db.commit()
        logger.info(
            f"Job {job_id} finalized with status '{job.status}'. "
            f"Success: {job.success_count}, Failed: {job.failure_count}, Total: {job.total_count}"
        )

    except Exception as fatal_err:
        logger.exception(f"Unexpected fatal error while processing job {job_id}: {fatal_err}")
        try:
            if 'job' in locals() and job:
                job.status = JobStatus.FAILED.value
                job.completed_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
