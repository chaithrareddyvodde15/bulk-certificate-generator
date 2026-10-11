import os
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.db.database import get_db
from app.db.models import Certificate, CertificateStatus

router = APIRouter(prefix="/certificates", tags=["Certificates"])
settings = get_settings()


@router.get(
    "/{certificate_id}",
    summary="Download generated certificate PDF",
    response_class=FileResponse
)
def download_certificate(certificate_id: int, db: Session = Depends(get_db)):
    """
    Downloads the generated certificate PDF for a given certificate ID.
    Performs security validation to prevent path traversal and validates generation state.
    """
    cert = db.query(Certificate).filter(Certificate.id == certificate_id).first()
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Certificate with ID {certificate_id} not found"
        )

    # Verify that the certificate belongs to a valid job
    if not cert.job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated job record not found"
        )

    # Check generation status
    if cert.status == CertificateStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Certificate generation is currently in progress. Please check back shortly."
        )

    if cert.status == CertificateStatus.FAILED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Certificate generation failed: {cert.error_message or 'Unknown generation error'}"
        )

    if not cert.file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate file reference is missing"
        )

    # Prevent directory traversal attacks: extract basename only
    safe_filename = os.path.basename(cert.file_path)
    base_dir = settings.certificates_path.resolve()
    resolved_file = (base_dir / safe_filename).resolve()

    # Verify path containment within configured output directory
    try:
        resolved_file.relative_to(base_dir)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid certificate file location"
        )

    if not resolved_file.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certificate PDF file not found on server"
        )

    download_name = f"certificate_{cert.id}.pdf"
    return FileResponse(
        path=str(resolved_file),
        media_type="application/pdf",
        filename=download_name
    )
