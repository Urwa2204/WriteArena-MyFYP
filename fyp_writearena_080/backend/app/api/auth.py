from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from app.db.database import get_db
from app.db.models import User
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.core.rate_limit import limiter
from app.core.config import settings
from app.services.otp_service import generate_otp, verify_otp
from datetime import datetime
import uuid
import re

router = APIRouter(prefix="/auth", tags=["auth"])

class RegisterBody(BaseModel):
    username: str
    email: EmailStr
    password: str
    interests: list = []

class LoginBody(BaseModel):
    email: EmailStr
    password: str

class ForgotBody(BaseModel):
    email: EmailStr

class ResetBody(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

class VerifyBody(BaseModel):
    email: EmailStr
    otp: str

class ResendBody(BaseModel):
    email: EmailStr

class RefreshBody(BaseModel):
    refresh_token: str

class GoogleAuthBody(BaseModel):
    credential: str   # the ID token returned by Google Identity Services on the frontend

@router.post("/register", status_code=201)
@limiter.limit("10/minute")
async def register(request: Request, body: RegisterBody, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == body.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(User).filter(User.email == body.email).first():
        raise HTTPException(400, "Email already registered")
    user = User(
        user_id=str(uuid.uuid4()),
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.username,
        interests=",".join(body.interests) if body.interests else "",
        is_verified=False,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # Email a one-time code; the account stays inactive until it's verified.
    generate_otp(user.email, purpose="verify")
    return {
        "message": "Account created. We've emailed you a verification code.",
        "email": user.email,
        "verification_required": True,
    }

@router.post("/verify-email")
@limiter.limit("10/minute")
async def verify_email(request: Request, body: VerifyBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(404, "No account found for this email")
    if user.is_verified:
        # Already verified — just issue tokens so the user can proceed.
        access = create_access_token({"sub": user.user_id})
        refresh = create_refresh_token({"sub": user.user_id})
        return {"access_token": access, "refresh_token": refresh, "user": _user_out(user)}
    if not verify_otp(body.email, body.otp, purpose="verify"):
        raise HTTPException(400, "Invalid or expired verification code")
    user.is_verified = True
    db.commit()
    db.refresh(user)
    access = create_access_token({"sub": user.user_id})
    refresh = create_refresh_token({"sub": user.user_id})
    return {"access_token": access, "refresh_token": refresh, "user": _user_out(user)}

@router.post("/resend-verification")
@limiter.limit("3/minute")
async def resend_verification(request: Request, body: ResendBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if user and not user.is_verified:
        generate_otp(user.email, purpose="verify")
    # Generic response to avoid leaking which emails exist / are verified.
    return {"message": "If this email needs verifying, a new code has been sent."}

@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, body: LoginBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if not user or not user.password_hash:
        raise HTTPException(401, "Invalid email or password")
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")
    if user.status == "banned":
        raise HTTPException(403, "Account suspended")
    if not user.is_verified:
        # 403 with a distinct detail the frontend routes on.
        raise HTTPException(403, "Email not verified")
    access = create_access_token({"sub": user.user_id})
    refresh = create_refresh_token({"sub": user.user_id})
    return {"access_token": access, "refresh_token": refresh, "user": _user_out(user)}

def _unique_username(db: Session, base: str) -> str:
    base = re.sub(r"[^a-zA-Z0-9_]", "", base)[:40] or "writer"
    username = base
    n = 1
    while db.query(User).filter(User.username == username).first():
        n += 1
        username = f"{base}{n}"
    return username


@router.post("/google")
@limiter.limit("15/minute")
async def google_auth(request: Request, body: GoogleAuthBody, db: Session = Depends(get_db)):
    """Sign in (or sign up) with a Google ID token from Google Identity Services
    on the frontend. Google has already verified the email, so the account is
    created pre-verified — no OTP step needed for this path."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(400, "Google sign-in is not configured on this server.")

    try:
        # Imported lazily so the app still starts if google-auth isn't installed
        # in an environment that doesn't need this feature.
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests
        idinfo = google_id_token.verify_oauth2_token(
            body.credential, google_requests.Request(), settings.GOOGLE_CLIENT_ID
        )
    except Exception:
        raise HTTPException(401, "Invalid or expired Google credential")

    email = idinfo.get("email")
    if not email or not idinfo.get("email_verified"):
        raise HTTPException(401, "Google account email is not verified")
    google_sub = idinfo.get("sub")
    if not google_sub:
        raise HTTPException(401, "Malformed Google credential")

    # 1) Already linked to this Google account
    user = db.query(User).filter(User.oauth_provider == "google", User.oauth_sub == google_sub).first()

    # 2) Not linked yet, but an account with this email already exists (e.g. they
    #    originally registered with a password) — link Google to it.
    if not user:
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.oauth_provider = user.oauth_provider or "google"
            user.oauth_sub = user.oauth_sub or google_sub
            user.is_verified = True

    # 3) Brand-new account
    if not user:
        name = idinfo.get("name") or email.split("@")[0]
        picture = idinfo.get("picture")
        user = User(
            user_id=str(uuid.uuid4()),
            username=_unique_username(db, email.split("@")[0]),
            email=email,
            password_hash=None,
            oauth_provider="google",
            oauth_sub=google_sub,
            display_name=name,
            avatar_url=picture,
            is_verified=True,
            created_at=datetime.utcnow(),
        )
        db.add(user)

    if user.status == "banned":
        raise HTTPException(403, "Account suspended")

    db.commit()
    db.refresh(user)
    access = create_access_token({"sub": user.user_id})
    refresh = create_refresh_token({"sub": user.user_id})
    return {"access_token": access, "refresh_token": refresh, "user": _user_out(user)}


@router.post("/refresh")
async def refresh_token(body: RefreshBody, db: Session = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid refresh token")
        user_id = payload.get("sub")
        user = db.query(User).filter(User.user_id == user_id).first()
        if not user:
            raise HTTPException(401, "User not found")
        access = create_access_token({"sub": user.user_id})
        return {"access_token": access}
    except Exception:
        raise HTTPException(401, "Invalid refresh token")

@router.post("/forgot-password")
@limiter.limit("3/minute")
async def forgot_password(request: Request, body: ForgotBody, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email).first()
    if user:
        generate_otp(body.email, purpose="reset")
    # Always return success to prevent email enumeration
    return {"message": "If this email exists, an OTP has been sent"}

@router.post("/reset-password")
async def reset_password(body: ResetBody, db: Session = Depends(get_db)):
    if not verify_otp(body.email, body.otp, purpose="reset"):
        raise HTTPException(400, "Invalid or expired OTP")
    user = db.query(User).filter(User.email == body.email).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"message": "Password reset successful"}

def _user_out(user: User) -> dict:
    return {
        "user_id": user.user_id, "username": user.username, "email": user.email,
        "display_name": user.display_name, "pen_name": user.pen_name,
        "avatar_url": user.avatar_url, "role": user.role,
        "is_verified": user.is_verified,
        "xp_points": user.xp_points, "level": user.level, "rank": user.rank,
        "streak_count": user.streak_count,
    }
