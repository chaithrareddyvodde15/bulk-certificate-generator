import os
from pathlib import Path
from typing import Optional
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.pdfgen import canvas
from app.core.config import get_settings


def draw_decorative_seal(c: canvas.Canvas, cx: float, cy: float, radius: float = 24.0) -> None:
    """Draws a vector seal with rosette ridges and a center badge."""
    c.saveState()
    # Outer gold circle
    c.setStrokeColor(colors.HexColor("#C59B27"))
    c.setFillColor(colors.HexColor("#FEF3C7"))
    c.setLineWidth(2)
    c.circle(cx, cy, radius, stroke=1, fill=1)

    # Inner ring
    c.setStrokeColor(colors.HexColor("#B45309"))
    c.setLineWidth(1)
    c.circle(cx, cy, radius - 4, stroke=1, fill=0)

    # Central star/crest text
    c.setFillColor(colors.HexColor("#92400E"))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(cx, cy + 2, "VERIFIED")
    c.setFont("Helvetica", 6)
    c.drawCentredString(cx, cy - 6, "OFFICIAL")
    c.restoreState()


def draw_certificate_borders(c: canvas.Canvas, width: float, height: float) -> None:
    """Draws double borders with decorative corner accents."""
    margin_outer = 25
    margin_inner = 32

    # Outer slate border
    c.saveState()
    c.setStrokeColor(colors.HexColor("#1E293B"))
    c.setLineWidth(3)
    c.rect(margin_outer, margin_outer, width - (2 * margin_outer), height - (2 * margin_outer))

    # Inner gold border
    c.setStrokeColor(colors.HexColor("#D97706"))
    c.setLineWidth(1)
    c.rect(margin_inner, margin_inner, width - (2 * margin_inner), height - (2 * margin_inner))

    # Corner decorative squares
    corner_size = 8
    c.setFillColor(colors.HexColor("#D97706"))
    for x in [margin_inner - corner_size / 2, width - margin_inner - corner_size / 2]:
        for y in [margin_inner - corner_size / 2, height - margin_inner - corner_size / 2]:
            c.rect(x, y, corner_size, corner_size, fill=1, stroke=0)

    # Subtle top and bottom accent banners
    c.setFillColor(colors.HexColor("#0F172A"))
    c.rect(width / 2 - 80, height - margin_outer - 4, 160, 4, fill=1, stroke=0)
    c.rect(width / 2 - 80, margin_outer, 160, 4, fill=1, stroke=0)
    c.restoreState()


def generate_certificate_pdf(
    certificate_id: int,
    recipient_name: str,
    recipient_email: str,
    course_name: str,
    certificate_title: str,
    event_name: str,
    organization_name: str,
    issue_date: str,
    output_dir: Optional[Path] = None
) -> str:
    """
    Generates a single landscape A4 PDF certificate.
    Returns the relative filename (e.g. 'certificate_123.pdf').
    """
    settings = get_settings()
    dest_dir = output_dir or settings.certificates_path
    dest_dir.mkdir(parents=True, exist_ok=True)

    filename = f"certificate_{certificate_id}.pdf"
    file_path = dest_dir / filename

    # Dimensions for landscape A4
    page_width, page_height = landscape(A4)

    # Create Canvas
    c = canvas.Canvas(str(file_path), pagesize=landscape(A4))
    c.setTitle(f"{certificate_title} - {recipient_name}")
    c.setSubject(course_name)
    c.setAuthor(organization_name)

    # 1. Background subtle tint
    c.setFillColor(colors.HexColor("#FAFAFA"))
    c.rect(0, 0, page_width, page_height, fill=1, stroke=0)

    # 2. Borders & Corner ornaments
    draw_certificate_borders(c, page_width, page_height)

    center_x = page_width / 2

    # 3. Organization Header
    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("Helvetica-Bold", 14)
    c.drawCentredString(center_x, page_height - 75, organization_name.upper())

    # 4. Certificate Title
    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(center_x, page_height - 120, certificate_title.upper())

    # Title divider line
    c.setStrokeColor(colors.HexColor("#D97706"))
    c.setLineWidth(1.5)
    c.line(center_x - 140, page_height - 132, center_x + 140, page_height - 132)

    # Small diamond on divider line
    c.setFillColor(colors.HexColor("#D97706"))
    diamond = c.beginPath()
    diamond.moveTo(center_x, page_height - 128)
    diamond.lineTo(center_x + 4, page_height - 132)
    diamond.lineTo(center_x, page_height - 136)
    diamond.lineTo(center_x - 4, page_height - 132)
    diamond.close()
    c.drawPath(diamond, fill=1, stroke=0)

    # 5. Presentation line
    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, page_height - 170, "THIS IS PROUDLY PRESENTED TO")

    # 6. Recipient Name
    c.setFillColor(colors.HexColor("#1E293B"))
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(center_x, page_height - 215, recipient_name)

    # Name underline
    c.setStrokeColor(colors.HexColor("#CBD5E1"))
    c.setLineWidth(1)
    name_width = max(len(recipient_name) * 14, 220)
    c.line(center_x - (name_width / 2), page_height - 225, center_x + (name_width / 2), page_height - 225)

    # 7. Statement & Course Info
    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("Helvetica", 12)
    c.drawCentredString(
        center_x,
        page_height - 260,
        "for successfully completing and demonstrating exceptional competence in"
    )

    c.setFillColor(colors.HexColor("#0F172A"))
    c.setFont("Helvetica-Bold", 16)
    c.drawCentredString(center_x, page_height - 290, course_name)

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 11)
    c.drawCentredString(center_x, page_height - 315, f"conducted during {event_name}")

    # 8. Decorative Seal
    draw_decorative_seal(c, center_x, 110, radius=26)

    # 9. Left Footer: Issue Date & Signatory
    left_x = 120
    c.setStrokeColor(colors.HexColor("#94A3B8"))
    c.setLineWidth(1)
    c.line(left_x, 105, left_x + 150, 105)

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(left_x + 75, 90, "Authorized Signatory")

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 9)
    c.drawCentredString(left_x + 75, 75, f"Date: {issue_date}")

    # 10. Right Footer: Verification / Reference ID
    right_x = page_width - 270
    c.setStrokeColor(colors.HexColor("#94A3B8"))
    c.setLineWidth(1)
    c.line(right_x, 105, right_x + 150, 105)

    c.setFillColor(colors.HexColor("#334155"))
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(right_x + 75, 90, "Certificate Verification")

    c.setFillColor(colors.HexColor("#64748B"))
    c.setFont("Helvetica", 9)
    c.drawCentredString(right_x + 75, 75, f"Ref: CERT-{certificate_id:06d}")

    # 11. Bottom Security Note
    c.setFillColor(colors.HexColor("#94A3B8"))
    c.setFont("Helvetica", 7.5)
    c.drawCentredString(
        center_x,
        42,
        f"This document is an authentic record issued by {organization_name}. Certificate ID: #{certificate_id}"
    )

    # Save and finalize
    c.showPage()
    c.save()

    return filename
