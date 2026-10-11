from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.db.database import get_db

router = APIRouter(prefix="/health", tags=["Health"])
settings = get_settings()


@router.get("", summary="Service Health Check")
def get_health(db: Session = Depends(get_db)):
    """
    Returns health status of the application and database connectivity.
    """
    try:
        db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connectivity failed"
        )

    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "database": db_status,
        "environment": settings.APP_ENV
    }
