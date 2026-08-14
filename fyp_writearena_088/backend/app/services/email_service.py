"""Email delivery for OTP verification and password reset.

Tries real delivery in this order, falling back at each step:
  1. Resend (RESEND_API_KEY set) — a single HTTPS call, no mail-server setup.
  2. SMTP (SMTP_HOST + SMTP_USER set) — Gmail app password, SendGrid, Mailgun, etc.
  3. Console print — local development only; the code is never actually emailed.

Configure either #1 or #2 via .env to send real emails. See SETUP.md.
"""
import json
import smtplib
import ssl
import urllib.request
import urllib.error
import logging
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger("writearena.email")


def _resend_configured() -> bool:
    return bool(settings.RESEND_API_KEY)


def _smtp_configured() -> bool:
    return bool(settings.SMTP_HOST and settings.SMTP_USER)


def _send_via_resend(to_email: str, subject: str, body: str) -> bool:
    payload = {
        "from": settings.EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "text": body,
    }
    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {settings.RESEND_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            return 200 <= resp.status < 300
    except urllib.error.HTTPError as exc:
        logger.warning("Resend rejected the send to %s: %s %s", to_email, exc.code, exc.read()[:300])
        return False
    except Exception as exc:  # pragma: no cover - network dependent
        logger.warning("Resend request failed for %s: %s", to_email, exc, exc_info=True)
        return False


def _send_via_smtp(to_email: str, subject: str, body: str) -> bool:
    msg = EmailMessage()
    msg["From"] = settings.EMAIL_FROM or settings.SMTP_USER
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        ctx = ssl.create_default_context()
        if settings.SMTP_USE_TLS:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as server:
                server.ehlo()
                server.starttls(context=ctx)
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        else:
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, context=ctx, timeout=15) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        return True
    except Exception as exc:  # pragma: no cover - network dependent
        logger.warning("SMTP send failed for %s: %s", to_email, exc, exc_info=True)
        return False


def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send a plain-text email. Returns True only if a real send actually succeeded."""
    if _resend_configured():
        if _send_via_resend(to_email, subject, body):
            return True
        print("[EMAIL] Resend failed — falling back to SMTP/console for this message.")

    if _smtp_configured():
        if _send_via_smtp(to_email, subject, body):
            return True
        print("[EMAIL] SMTP failed — falling back to console for this message.")

    print(f"\n[EMAIL:DEV] (no email provider configured — printing instead)"
          f"\n  To:      {to_email}"
          f"\n  Subject: {subject}"
          f"\n  Body:    {body}\n")
    return False


def send_otp_email(to_email: str, otp: str, purpose: str = "verify") -> bool:
    """Compose and send the OTP email for the given purpose."""
    if purpose == "reset":
        subject = "WriteArena — your password reset code"
        body = (
            f"You asked to reset your WriteArena password.\n\n"
            f"Your one-time code is: {otp}\n\n"
            f"It expires in {settings.OTP_TTL_SECONDS // 60} minutes. "
            f"If you didn't request this, you can ignore this email."
        )
    else:
        subject = "WriteArena — verify your email"
        body = (
            f"Welcome to WriteArena!\n\n"
            f"Your email verification code is: {otp}\n\n"
            f"Enter it in the app to activate your account. "
            f"It expires in {settings.OTP_TTL_SECONDS // 60} minutes."
        )
    return send_email(to_email, subject, body)
