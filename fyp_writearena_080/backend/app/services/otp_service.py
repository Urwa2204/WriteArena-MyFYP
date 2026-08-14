"""Email verification / password-reset one-time codes.

DB-backed (not an in-memory dict) so a code survives a server restart and
behaves correctly if the backend ever runs as more than one process — an
in-memory store does neither, since each process/restart gets its own.

Codes are stored hashed (not plaintext) as basic defense-in-depth against a
raw DB dump, and each code allows a limited number of wrong guesses before
it's invalidated outright (previously only the per-IP request rate limit on
the /verify-email and /reset-password endpoints stood between an attacker
and brute-forcing a 6-digit code within its TTL window).
"""
import hashlib
import random
from datetime import datetime, timedelta

from app.core.config import settings
from app.db.database import SessionLocal
from app.db.models import OtpCode
from app.services.email_service import send_otp_email

MAX_ATTEMPTS = 5


def _key(email: str, purpose: str) -> str:
    return f"{purpose}:{email.lower()}"


def _hash(otp: str) -> str:
    # Not a password — a fast hash keyed with the app secret is enough to
    # keep a raw DB dump from directly exposing valid codes.
    return hashlib.sha256((settings.SECRET_KEY + ":" + otp).encode()).hexdigest()


def generate_otp(email: str, purpose: str = "verify") -> str:
    """Create, store, and email a 6-digit OTP for the given purpose
    ("verify" for email verification, "reset" for password reset)."""
    otp = str(random.randint(100000, 999999))
    key = _key(email, purpose)
    db = SessionLocal()
    try:
        row = db.query(OtpCode).filter(OtpCode.key == key).first()
        if not row:
            row = OtpCode(key=key)
            db.add(row)
        row.otp_hash = _hash(otp)
        row.expires_at = datetime.utcnow() + timedelta(seconds=settings.OTP_TTL_SECONDS)
        row.attempts = 0
        db.commit()
    finally:
        db.close()

    if settings.ENV == "development":
        print(f"\n[DEV] {purpose} OTP for {email}: {otp}\n")
    # Deliver by email (falls back to console if no email provider is configured).
    send_otp_email(email, otp, purpose)
    return otp


def verify_otp(email: str, otp: str, purpose: str = "verify") -> bool:
    key = _key(email, purpose)
    db = SessionLocal()
    try:
        row = db.query(OtpCode).filter(OtpCode.key == key).first()
        if not row:
            return False
        if datetime.utcnow() > row.expires_at:
            db.delete(row); db.commit()
            return False
        if row.attempts >= MAX_ATTEMPTS:
            # Too many wrong guesses — invalidate outright rather than let
            # the window keep ticking; the user has to request a fresh code.
            db.delete(row); db.commit()
            return False
        if row.otp_hash != _hash(otp):
            row.attempts += 1
            db.commit()
            return False
        db.delete(row)
        db.commit()
        return True
    finally:
        db.close()


def clear_otp(email: str, purpose: str = "verify"):
    key = _key(email, purpose)
    db = SessionLocal()
    try:
        row = db.query(OtpCode).filter(OtpCode.key == key).first()
        if row:
            db.delete(row)
            db.commit()
    finally:
        db.close()
