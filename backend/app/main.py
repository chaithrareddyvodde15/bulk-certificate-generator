import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routes import certificates, health, jobs
from app.core.config import get_settings
from app.db.database import Base, engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("bulk_certificate_generator")

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Ensure generated certificates directory exists
    settings.certificates_path.mkdir(parents=True, exist_ok=True)
    logger.info(f"Initialized {settings.APP_NAME} in '{settings.APP_ENV}' mode.")
    yield
    logger.info("Application shutdown completed.")


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Production-ready Bulk Certificate Generator REST API. "
        "Allows asynchronous bulk certificate generation with fault isolation, "
        "real-time polling progress, and secure PDF delivery."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(health.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")
app.include_router(certificates.router, prefix="/api")


@app.get("/", summary="API Root", tags=["Health"])
def root_index():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "documentation": "/docs",
        "health": "/api/health"
    }


@app.exception_handler(Exception)
async def global_unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "An internal server error occurred. Please contact support or consult system logs."
        }
    )
