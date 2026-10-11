import os
import shutil
import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.config import get_settings
from app.db.database import Base, get_db
import app.db.database as db_module
import app.services.job_processor as processor_module
from app.main import app

settings = get_settings()


@pytest.fixture(scope="session")
def temp_cert_dir():
    temp_dir = tempfile.mkdtemp(prefix="test_certs_")
    yield Path(temp_dir)
    shutil.rmtree(temp_dir, ignore_errors=True)


@pytest.fixture(scope="function")
def test_db_session(temp_cert_dir, monkeypatch):
    """
    Creates an isolated in-memory SQLite database per test.
    """
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)
    Base.metadata.create_all(bind=engine)

    # Monkeypatch settings certificates directory
    monkeypatch.setattr(settings, "CERTIFICATES_DIR", str(temp_cert_dir))
    monkeypatch.setattr(processor_module, "SessionLocal", TestingSessionLocal)
    monkeypatch.setattr(db_module, "SessionLocal", TestingSessionLocal)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSessionLocal()
    yield db

    db.close()
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def client(test_db_session):
    with TestClient(app) as c:
        yield c
