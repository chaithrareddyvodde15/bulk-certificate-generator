import pytest
from app.db.models import GenerationJob, JobStatus
from app.services.job_processor import process_generation_job


def test_health_endpoint(client):
    """Test 21: Health endpoint returns status 200 and healthy."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_valid_job_creation(client):
    """Test 1: Valid job creation returns 202 and pending status."""
    payload = {
        "certificate_title": "Certificate of Completion",
        "event_name": "Full Stack Bootcamp",
        "organization_name": "Tech Academy",
        "issue_date": "2026-10-10",
        "recipients": [
            {
                "name": "Sarah Connor",
                "email": "sarah@cyberdyne.com",
                "course": "Systems Engineering"
            }
        ]
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] in ["PENDING", "PROCESSING", "COMPLETED"]
    assert data["total"] == 1


def test_job_creation_multiple_recipients(client):
    """Test 2: Job creation with multiple recipients."""
    payload = {
        "certificate_title": "Certificate of Participation",
        "event_name": "AI Workshop 2026",
        "organization_name": "ABC Organization",
        "issue_date": "2026-10-08",
        "recipients": [
            {"name": "John Doe", "email": "john@example.com", "course": "Artificial Intelligence"},
            {"name": "Jane Smith", "email": "jane@example.com", "course": "Artificial Intelligence"},
            {"name": "Bob Taylor", "email": "bob@example.com", "course": "Machine Learning"}
        ]
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert data["total"] == 3


def test_invalid_recipient_name(client):
    """Test 3: Blank/empty recipient name triggers 422 Unprocessable Entity."""
    payload = {
        "certificate_title": "Certificate of Completion",
        "event_name": "AI Workshop",
        "organization_name": "ABC Org",
        "issue_date": "2026-10-08",
        "recipients": [
            {"name": "   ", "email": "valid@example.com", "course": "AI Track"}
        ]
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 422


def test_invalid_email(client):
    """Test 4: Invalid email format triggers 422."""
    payload = {
        "certificate_title": "Certificate of Completion",
        "event_name": "AI Workshop",
        "organization_name": "ABC Org",
        "issue_date": "2026-10-08",
        "recipients": [
            {"name": "Valid Name", "email": "not-a-valid-email", "course": "AI Track"}
        ]
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 422


def test_missing_course(client):
    """Test 5: Missing or blank course triggers 422."""
    payload = {
        "certificate_title": "Certificate of Completion",
        "event_name": "AI Workshop",
        "organization_name": "ABC Org",
        "issue_date": "2026-10-08",
        "recipients": [
            {"name": "Valid Name", "email": "valid@example.com", "course": "  "}
        ]
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 422


def test_empty_recipients_list(client):
    """Test 6: Empty recipients array triggers 422."""
    payload = {
        "certificate_title": "Certificate of Completion",
        "event_name": "AI Workshop",
        "organization_name": "ABC Org",
        "issue_date": "2026-10-08",
        "recipients": []
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 422


def test_missing_required_certificate_information(client):
    """Test 7: Missing required certificate information triggers 422."""
    payload = {
        "certificate_title": "   ",
        "event_name": "AI Workshop",
        "organization_name": "ABC Org",
        "issue_date": "2026-10-08",
        "recipients": [
            {"name": "John Doe", "email": "john@example.com", "course": "AI"}
        ]
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 422


def test_successful_bulk_generation(client):
    """Test 9: Successful bulk generation completes and creates certificates."""
    payload = {
        "certificate_title": "Professional Certificate",
        "event_name": "Cloud Expo 2026",
        "organization_name": "Cloud Foundation",
        "issue_date": "2026-11-01",
        "recipients": [
            {"name": "User One", "email": "user1@example.com", "course": "Kubernetes"},
            {"name": "User Two", "email": "user2@example.com", "course": "Terraform"}
        ]
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    status_resp = client.get(f"/api/jobs/{job_id}")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["status"] == JobStatus.COMPLETED.value
    assert data["successful"] == 2
    assert data["failed"] == 0


def test_correct_job_status_and_progress_calculation(client):
    """Test 10: Correct job status counters and progress percentage formula."""
    payload = {
        "certificate_title": "DevOps Specialist",
        "event_name": "DevOps Days",
        "organization_name": "DevOps Institute",
        "issue_date": "2026-11-05",
        "recipients": [
            {"name": "Dev One", "email": "dev1@example.com", "course": "CI/CD Pipeline"},
            {"name": "Dev Two", "email": "dev2@example.com", "course": "Observability"}
        ]
    }
    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    status_resp = client.get(f"/api/jobs/{job_id}")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["total"] == 2
    assert data["completed"] == 2
    assert data["pending"] == 0
    assert data["progress_percentage"] == 100.0


def test_one_recipient_failing_while_others_succeed(client, monkeypatch):
    """
    Test 11: One recipient failing while others succeed results in COMPLETED_WITH_ERRORS.
    """
    # Mock generator to fail when recipient_email contains 'fail'
    from app.services import certificate_generator

    original_gen = certificate_generator.generate_certificate_pdf

    def conditional_fail_generator(*args, **kwargs):
        if "fail" in kwargs.get("recipient_email", ""):
            raise RuntimeError("Disk quota exceeded for recipient")
        return original_gen(*args, **kwargs)

    monkeypatch.setattr("app.services.job_processor.generate_certificate_pdf", conditional_fail_generator)

    payload = {
        "certificate_title": "Certificate of Completion",
        "event_name": "DevSecOps Seminar",
        "organization_name": "Cyber Defense Corp",
        "issue_date": "2026-10-20",
        "recipients": [
            {"name": "Success User", "email": "pass@example.com", "course": "Security Operations"},
            {"name": "Failing User", "email": "fail@example.com", "course": "Security Operations"}
        ]
    }

    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    status_resp = client.get(f"/api/jobs/{job_id}")
    assert status_resp.status_code == 200
    data = status_resp.json()

    assert data["status"] == JobStatus.COMPLETED_WITH_ERRORS.value
    assert data["total"] == 2
    assert data["successful"] == 1
    assert data["failed"] == 1
    assert data["completed"] == 2
    assert data["progress_percentage"] == 100.0


def test_all_recipients_failing(client, monkeypatch):
    """
    Test 12: All recipients failing sets status to FAILED.
    """
    def always_fail(*args, **kwargs):
        raise RuntimeError("PDF rendering engine crashed")

    monkeypatch.setattr("app.services.job_processor.generate_certificate_pdf", always_fail)

    payload = {
        "certificate_title": "Certificate of Completion",
        "event_name": "Python Conference",
        "organization_name": "Python Org",
        "issue_date": "2026-10-20",
        "recipients": [
            {"name": "User Alpha", "email": "alpha@example.com", "course": "Python Core"},
            {"name": "User Beta", "email": "beta@example.com", "course": "Python Core"}
        ]
    }

    response = client.post("/api/jobs", json=payload)
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    status_resp = client.get(f"/api/jobs/{job_id}")
    assert status_resp.status_code == 200
    data = status_resp.json()

    assert data["status"] == JobStatus.FAILED.value
    assert data["total"] == 2
    assert data["successful"] == 0
    assert data["failed"] == 2
    assert data["progress_percentage"] == 100.0


def test_job_listing_and_pagination(client):
    """Test 20: Job listing, pagination, and search."""
    # Create 3 jobs
    for i in range(3):
        client.post(
            "/api/jobs",
            json={
                "certificate_title": f"Title {i}",
                "event_name": f"Event {i}",
                "organization_name": f"Org {i}",
                "issue_date": "2026-10-01",
                "recipients": [{"name": f"User {i}", "email": f"u{i}@test.com", "course": "Track"}]
            }
        )

    # List page 1 with page_size 2
    resp = client.get("/api/jobs?page=1&page_size=2")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 3
    assert len(data["items"]) == 2
    assert data["page"] == 1
    assert data["page_size"] == 2

    # Search filter
    search_resp = client.get("/api/jobs?search=Event 1")
    assert search_resp.status_code == 200
    search_data = search_resp.json()
    assert any("Event 1" in item["event_name"] for item in search_data["items"])
