from app.db.models import Certificate, CertificateStatus, GenerationJob, JobStatus


def test_retrieving_job_certificates(client):
    """Test 13: Retrieving all certificates belonging to a job."""
    payload = {
        "certificate_title": "Certificate of Attendance",
        "event_name": "Web Dev Summit",
        "organization_name": "Dev Alliance",
        "issue_date": "2026-10-12",
        "recipients": [
            {"name": "Alice Cooper", "email": "alice@rock.com", "course": "React"},
            {"name": "Bob Dylan", "email": "bob@folk.com", "course": "FastAPI"}
        ]
    }
    create_resp = client.post("/api/jobs", json=payload)
    assert create_resp.status_code == 202
    job_id = create_resp.json()["job_id"]

    certs_resp = client.get(f"/api/jobs/{job_id}/certificates")
    assert certs_resp.status_code == 200
    certs = certs_resp.json()
    assert len(certs) == 2
    assert certs[0]["recipient_name"] == "Alice Cooper"
    assert certs[0]["status"] == "SUCCESS"
    assert certs[0]["download_url"] == f"/api/certificates/{certs[0]['id']}"


def test_download_successful_certificate(client):
    """Test 14: Downloading a successful certificate returns PDF."""
    payload = {
        "certificate_title": "Certified Cloud Architect",
        "event_name": "AWS Summit",
        "organization_name": "Cloud Org",
        "issue_date": "2026-10-15",
        "recipients": [
            {"name": "Neo Anderson", "email": "neo@matrix.org", "course": "Cloud Architecture"}
        ]
    }
    create_resp = client.post("/api/jobs", json=payload)
    job_id = create_resp.json()["job_id"]

    certs_resp = client.get(f"/api/jobs/{job_id}/certificates")
    cert_id = certs_resp.json()[0]["id"]

    download_resp = client.get(f"/api/certificates/{cert_id}")
    assert download_resp.status_code == 200
    assert download_resp.headers["content-type"] == "application/pdf"
    assert len(download_resp.content) > 1000
    assert download_resp.content.startswith(b"%PDF-")


def test_download_pending_certificate(client, test_db_session):
    """Test 15: Attempting to download a pending certificate returns 409 Conflict."""
    job = GenerationJob(
        certificate_title="Test Title",
        event_name="Test Event",
        organization_name="Test Org",
        issue_date="2026-10-01",
        status=JobStatus.PENDING.value,
        total_count=1
    )
    test_db_session.add(job)
    test_db_session.flush()

    cert = Certificate(
        job_id=job.id,
        recipient_name="Pending Recipient",
        recipient_email="pending@test.com",
        course="Pending Course",
        status=CertificateStatus.PENDING.value
    )
    test_db_session.add(cert)
    test_db_session.commit()

    resp = client.get(f"/api/certificates/{cert.id}")
    assert resp.status_code == 409
    assert "in progress" in resp.json()["detail"].lower()


def test_download_failed_certificate(client, test_db_session):
    """Test 16: Attempting to download a failed certificate returns 409 Conflict."""
    job = GenerationJob(
        certificate_title="Test Title",
        event_name="Test Event",
        organization_name="Test Org",
        issue_date="2026-10-01",
        status=JobStatus.FAILED.value,
        total_count=1
    )
    test_db_session.add(job)
    test_db_session.flush()

    cert = Certificate(
        job_id=job.id,
        recipient_name="Failed Recipient",
        recipient_email="failed@test.com",
        course="Failed Course",
        status=CertificateStatus.FAILED.value,
        error_message="Font rendering failed"
    )
    test_db_session.add(cert)
    test_db_session.commit()

    resp = client.get(f"/api/certificates/{cert.id}")
    assert resp.status_code == 409
    assert "failed" in resp.json()["detail"].lower()


def test_nonexistent_job(client):
    """Test 17: Requesting a non-existent job returns 404."""
    resp = client.get("/api/jobs/9999999")
    assert resp.status_code == 404
    certs_resp = client.get("/api/jobs/9999999/certificates")
    assert certs_resp.status_code == 404


def test_nonexistent_certificate(client):
    """Test 18: Requesting a non-existent certificate returns 404."""
    resp = client.get("/api/certificates/9999999")
    assert resp.status_code == 404


def test_missing_pdf_file_on_server(client, test_db_session):
    """Test 19: Certificate marked SUCCESS but missing on disk returns 404."""
    job = GenerationJob(
        certificate_title="Test Title",
        event_name="Test Event",
        organization_name="Test Org",
        issue_date="2026-10-01",
        status=JobStatus.COMPLETED.value,
        total_count=1
    )
    test_db_session.add(job)
    test_db_session.flush()

    cert = Certificate(
        job_id=job.id,
        recipient_name="Ghost User",
        recipient_email="ghost@test.com",
        course="Invisible Systems",
        status=CertificateStatus.SUCCESS.value,
        file_path="non_existent_certificate_ghost.pdf"
    )
    test_db_session.add(cert)
    test_db_session.commit()

    resp = client.get(f"/api/certificates/{cert.id}")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()
