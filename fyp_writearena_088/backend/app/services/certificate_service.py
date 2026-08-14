"""Generate a WriteArena certificate PDF for high scorers.

Eligibility: a submission scoring >= CERT_MIN_SCORE while on a streak of
>= CERT_MIN_STREAK days. The certificate is drawn on a parchment-scroll style
with the logo mark, the writer's name and pen name, the score, and the date.
"""
import io
from datetime import datetime

from app.core.config import settings


def is_eligible(user, best_score: float) -> bool:
    return (best_score or 0) >= settings.CERT_MIN_SCORE and (user.streak_count or 0) >= settings.CERT_MIN_STREAK


def generate_pdf(name: str, pen_name: str, score: float, date: datetime = None) -> bytes:
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    from reportlab.lib.colors import HexColor

    date = date or datetime.utcnow()
    ROSE = HexColor("#663F46"); PLUM = HexColor("#7B506F"); GOLD = HexColor("#C99A46")
    PARCH = HexColor("#F3EAD0"); PARCH2 = HexColor("#EADCB4"); INK = HexColor("#4A3F2A")

    buf = io.BytesIO()
    W, H = landscape(A4)
    c = canvas.Canvas(buf, pagesize=(W, H))

    # parchment background
    c.setFillColor(PARCH); c.rect(0, 0, W, H, fill=1, stroke=0)
    c.setFillColor(PARCH2); c.rect(28, 28, W - 56, H - 56, fill=1, stroke=0)
    c.setStrokeColor(GOLD); c.setLineWidth(2.2); c.rect(40, 40, W - 80, H - 80, fill=0, stroke=1)
    c.setLineWidth(0.8); c.rect(48, 48, W - 96, H - 96, fill=0, stroke=1)

    cx = W / 2
    # gold feather mark
    c.saveState(); c.translate(cx, H - 92)
    c.setFillColor(GOLD)
    p = c.beginPath(); p.moveTo(0, 22); p.curveTo(9, 12, 10, -8, 3, -18)
    p.curveTo(1.5, -4, -1.5, -4, -3, -18); p.curveTo(-10, -8, -9, 12, 0, 22); c.drawPath(p, fill=1, stroke=0)
    c.setFillColor(ROSE); p2 = c.beginPath(); p2.moveTo(-2, -10); p2.lineTo(2, -10); p2.lineTo(0, 2); c.drawPath(p2, fill=1)
    c.restoreState()

    c.setFillColor(ROSE)
    c.setFont("Times-Bold", 30); c.drawCentredString(cx, H - 150, "Certificate of Achievement")
    c.setFillColor(INK); c.setFont("Times-Italic", 14)
    c.drawCentredString(cx, H - 178, "WriteArena  \u00b7  A Real-Time Competitive Writing Platform")

    c.setFont("Times-Roman", 15); c.drawCentredString(cx, H - 222, "This certifies that")
    c.setFillColor(PLUM); c.setFont("Times-BoldItalic", 34)
    c.drawCentredString(cx, H - 262, name or "Writer")
    if pen_name:
        c.setFillColor(ROSE); c.setFont("Times-Italic", 15)
        c.drawCentredString(cx, H - 286, "writing as \u201c" + pen_name + "\u201d")

    c.setFillColor(INK); c.setFont("Times-Roman", 14)
    c.drawCentredString(cx, H - 322,
                        "has demonstrated outstanding writing, earning a composite score of")
    c.setFillColor(GOLD); c.setFont("Times-Bold", 40)
    c.drawCentredString(cx, H - 372, f"{score:.1f} / 100")

    c.setStrokeColor(GOLD); c.setLineWidth(1)
    c.line(90, 92, 250, 92); c.line(W - 250, 92, W - 90, 92)
    c.setFillColor(INK); c.setFont("Times-Roman", 11)
    c.drawCentredString(170, 78, date.strftime("%d %B %Y"))
    c.drawCentredString(W - 170, 78, "WriteArena")
    c.setFont("Times-Italic", 9)
    c.drawCentredString(170, 66, "Date"); c.drawCentredString(W - 170, 66, "Awarded by")

    c.showPage(); c.save()
    return buf.getvalue()
