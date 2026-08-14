from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response, RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta

from app.db.database import get_db
from app.db.models import Payment, Subscription, StreakFreeze, Tournament, TournamentEntry, User, Submission, AnalysisResult
from app.core.dependencies import get_current_user
from app.core.config import settings
from app.services import payment_service, certificate_service
from app.core.rate_limit import limiter

router = APIRouter(prefix="/payments", tags=["payments"])

PRICE = {
    "coach_subscription": settings.PRICE_COACH,
    "certificate": settings.PRICE_CERTIFICATE,
    "streak_freeze": settings.PRICE_STREAK_FREEZE,
    "tournament_entry": settings.PRICE_TOURNAMENT_ENTRY,
}


def _p_out(p: Payment) -> dict:
    return {"payment_id": p.payment_id, "purpose": p.purpose, "amount": p.amount,
            "currency": p.currency, "provider": p.provider, "status": p.status,
            "txn_ref": p.txn_ref, "created_at": p.created_at}


@router.get("/prices")
def prices():
    return {k: {"pkr": v, "usd": payment_service.price_in("USD", v)} for k, v in PRICE.items()}


@router.get("/mode")
def payments_mode():
    """Whether payments are running in sandbox (simulated) or live mode, so the
    checkout UI can be honest with the user about what's happening. Solo
    writing works fully offline; paid extras run in sandbox by default and can
    be wired to real JazzCash/EasyPaisa/NayaPay credentials in future work."""
    return {"mode": settings.PAYMENTS_MODE}


class InitiateBody(BaseModel):
    purpose: str
    provider: str = "jazzcash"
    currency: str = "PKR"
    ref_id: Optional[str] = None
    note: Optional[str] = None


@router.post("/initiate")
@limiter.limit("15/minute")
async def initiate(request: Request, body: InitiateBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    amount_pkr = PRICE.get(body.purpose)
    if body.purpose == "tournament_entry" and body.ref_id:
        t = db.query(Tournament).filter(Tournament.tournament_id == body.ref_id).first()
        if t and t.entry_fee:
            amount_pkr = t.entry_fee
    if amount_pkr is None:
        raise HTTPException(400, "Unknown purchase")
    amount = payment_service.price_in(body.currency, amount_pkr)
    p = payment_service.create_payment(db, current_user.user_id, body.purpose, amount,
                                        body.provider, body.currency, body.ref_id)
    if body.note:
        p.note = body.note[:1000]; db.commit()
    return {"payment": _p_out(p), "checkout": payment_service.checkout_payload(p)}


@router.post("/{payment_id}/confirm")
def confirm(payment_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Sandbox mode: completes the payment immediately (client-initiated).
    Live mode: this only reports status — a real payment can only be
    completed by the provider's own server-to-server callback (see
    /payments/callback/{provider} below), never by the browser alone."""
    p = db.query(Payment).filter(Payment.payment_id == payment_id, Payment.user_id == current_user.user_id).first()
    if not p:
        raise HTTPException(404, "Payment not found")
    if p.status == "completed":
        return {"status": "completed", "purpose": p.purpose, "result": _fulfill(db, p, current_user)}
    if not payment_service.verify_payment(db, p):
        if settings.PAYMENTS_MODE == "live":
            return {"status": "pending", "message": "Waiting for the provider to confirm this payment."}
        return {"status": "failed"}
    result = _fulfill(db, p, current_user)
    return {"status": "completed", "purpose": p.purpose, "result": result}


@router.post("/callback/{provider}")
async def provider_callback(provider: str, request: Request, db: Session = Depends(get_db)):
    """Server-to-server postback from JazzCash/EasyPaisa/NayaPay after the
    customer completes (or abandons) checkout on the provider's hosted page.
    This — not the browser's /confirm call — is the only trustworthy source
    of truth for whether real money actually moved."""
    if provider not in payment_service.PROVIDERS:
        raise HTTPException(404, "Unknown provider")

    content_type = request.headers.get("content-type", "")
    if "application/json" in content_type:
        payload = await request.json()
        payload["_signature"] = request.headers.get("X-NayaPay-Signature", "")
    else:
        form = await request.form()
        payload = dict(form)

    ok, txn_ref, ref_hint = payment_service.verify_callback(provider, payload)

    p = None
    if ref_hint:
        p = (db.query(Payment).filter(Payment.payment_id == ref_hint).first()
             or db.query(Payment).filter(Payment.txn_ref == ref_hint).first())
    if not p and txn_ref:
        p = db.query(Payment).filter(Payment.txn_ref == txn_ref).first()

    if not p:
        raise HTTPException(404, "Payment not found for this callback")
    if p.provider != provider:
        raise HTTPException(400, "Provider mismatch")

    if ok and p.status != "completed":
        p.status = "completed"
        user = db.query(User).filter(User.user_id == p.user_id).first()
        if user:
            _fulfill(db, p, user)
        db.commit()
    elif not ok and p.status == "pending":
        p.status = "failed"
        db.commit()

    # JazzCash/EasyPaisa expect the browser to end up back in the app after
    # their hosted page redirects here; NayaPay's callback is server-only.
    if provider in ("jazzcash", "easypaisa"):
        outcome = "success" if ok else "failed"
        return RedirectResponse(url=f"{settings.PUBLIC_BASE_URL.rstrip('/')}/settings?payment={outcome}", status_code=303)
    return {"received": True, "ok": ok}


def _fulfill(db, p: Payment, user: User) -> dict:
    now = datetime.utcnow()
    if p.purpose == "coach_subscription":
        sub = db.query(Subscription).filter(Subscription.user_id == user.user_id, Subscription.plan == "coach").first()
        base = now
        if sub and sub.expires_at and sub.expires_at > now:
            base = sub.expires_at
        if not sub:
            sub = Subscription(user_id=user.user_id, plan="coach")
            db.add(sub)
        sub.status = "active"; sub.expires_at = base + timedelta(days=30)
        db.commit()
        return {"active_until": sub.expires_at.isoformat()}
    if p.purpose == "streak_freeze":
        fz = StreakFreeze(user_id=user.user_id, reason=(p.note or "Away"), used_at=now, expires_at=now + timedelta(days=2))
        db.add(fz); db.commit()
        return {"freeze_id": fz.freeze_id, "protects_until": fz.expires_at.isoformat()}
    if p.purpose == "tournament_entry" and p.ref_id:
        t = db.query(Tournament).filter(Tournament.tournament_id == p.ref_id).first()
        entry = db.query(TournamentEntry).filter(TournamentEntry.tournament_id == p.ref_id,
                                                 TournamentEntry.user_id == user.user_id).first()
        if not entry:
            entry = TournamentEntry(tournament_id=p.ref_id, user_id=user.user_id)
            db.add(entry)
        entry.paid = True
        if t:
            t.prize_pool = (t.prize_pool or 0) + (t.entry_fee or settings.PRICE_TOURNAMENT_ENTRY)
        db.commit()
        return {"joined": True, "prize_pool": t.prize_pool if t else None}
    if p.purpose == "certificate":
        return {"ready": True}
    return {}


@router.get("/me")
def my_payments(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Payment).filter(Payment.user_id == current_user.user_id).order_by(Payment.created_at.desc()).limit(50).all()
    return [_p_out(p) for p in rows]


# ---------------- Streak freeze ----------------
class FreezeBody(BaseModel):
    reason: str
    provider: str = "jazzcash"
    currency: str = "PKR"


@router.post("/streak-freeze")
def buy_freeze(body: FreezeBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not body.reason.strip():
        raise HTTPException(400, "Please give a reason you'll be away.")
    amount = payment_service.price_in(body.currency, settings.PRICE_STREAK_FREEZE)
    p = payment_service.create_payment(db, current_user.user_id, "streak_freeze", amount, body.provider, body.currency)
    p.note = body.reason[:1000]; db.commit()
    return {"payment": _p_out(p), "checkout": payment_service.checkout_payload(p)}


# ---------------- Certificate ----------------
def _best_score(db, user_id):
    row = (db.query(AnalysisResult.final_score)
           .join(Submission, Submission.submission_id == AnalysisResult.submission_id)
           .filter(Submission.user_id == user_id)
           .order_by(AnalysisResult.final_score.desc()).first())
    return float(row[0]) if row else 0.0


@router.get("/certificate/eligibility")
def cert_eligibility(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    best = _best_score(db, current_user.user_id)
    eligible = certificate_service.is_eligible(current_user, best)
    paid = db.query(Payment).filter(Payment.user_id == current_user.user_id,
                                    Payment.purpose == "certificate", Payment.status == "completed").first()
    return {"eligible": eligible, "best_score": round(best, 1),
            "min_score": settings.CERT_MIN_SCORE, "streak": current_user.streak_count,
            "min_streak": settings.CERT_MIN_STREAK, "price_pkr": settings.PRICE_CERTIFICATE,
            "already_paid": bool(paid)}


@router.get("/certificate/download")
def cert_download(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    best = _best_score(db, current_user.user_id)
    if not certificate_service.is_eligible(current_user, best):
        raise HTTPException(403, "Not eligible for a certificate yet.")
    paid = db.query(Payment).filter(Payment.user_id == current_user.user_id,
                                    Payment.purpose == "certificate", Payment.status == "completed").first()
    if not paid:
        raise HTTPException(402, "Certificate not purchased.")
    try:
        pdf = certificate_service.generate_pdf(current_user.display_name or current_user.username,
                                               current_user.pen_name or "", best)
    except Exception as e:
        raise HTTPException(500, f"Could not render certificate: {e}")
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": "attachment; filename=WriteArena_Certificate.pdf"})
