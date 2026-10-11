from pathlib import Path
from app.services.certificate_generator import generate_certificate_pdf


def test_certificate_pdf_generation_valid(tmp_path: Path):
    """
    Test 8: Certificate PDF generation using ReportLab service.
    Verifies that a valid PDF file is created, has positive file size,
    and begins with standard PDF magic bytes.
    """
    cert_id = 999
    filename = generate_certificate_pdf(
        certificate_id=cert_id,
        recipient_name="Alice Johnson",
        recipient_email="alice@example.com",
        course_name="Advanced Neural Networks",
        certificate_title="Certificate of Excellence",
        event_name="Deep Learning Summit 2026",
        organization_name="AI Research Guild",
        issue_date="2026-10-15",
        output_dir=tmp_path
    )

    generated_file = tmp_path / filename
    assert generated_file.exists()
    assert generated_file.is_file()
    assert generated_file.stat().st_size > 1000

    # Verify standard PDF magic header
    with open(generated_file, "rb") as f:
        header = f.read(5)
        assert header == b"%PDF-"
