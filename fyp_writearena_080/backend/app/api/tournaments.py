from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Tournament, Submission, AnalysisResult, User, Topic
from app.core.dependencies import get_current_user, require_admin
from app.services import trends_service
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional
import uuid, random

router = APIRouter(prefix="/tournaments", tags=["tournaments"])


@router.post("/refresh-topics")
def refresh_topics(db: Session = Depends(get_db), admin: User = Depends(require_admin)):
    """Admin: pull fresh trending topics for every niche right now."""
    added = trends_service.sync_all(db)
    return {"refreshed": added}

@router.get("")
def list_tournaments(db: Session = Depends(get_db)):
    ts = db.query(Tournament).order_by(Tournament.created_at.desc()).limit(20).all()
    return [_t_out(t) for t in ts]

def _get_or_create_daily_topic(db: Session) -> Topic:
    """Shared by GET (browsing) and POST (submitting) so submit never
    depends on GET having run first in the same session — a fresh page load
    from an already-open tab, or a direct API call, should still work."""
    today = datetime.utcnow().date()
    topic = db.query(Topic).filter(Topic.is_daily == True,
        Topic.challenge_date >= datetime(today.year, today.month, today.day)).first()
    if topic:
        return topic
    topic = trends_service.pick_daily_topic(db)
    if topic:
        return topic
    # Final fallback if live scraping is unavailable.
    topic = Topic(topic_id=str(uuid.uuid4()),
                  title="Write about a change you would like to see in the world.",
                  niche="society", is_daily=True,
                  challenge_date=datetime.utcnow(), approved=True)
    db.add(topic)
    db.commit()
    return topic


@router.get("/daily-challenge")
def daily_challenge(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    today = datetime.utcnow().date()
    topic = _get_or_create_daily_topic(db)
    subs = db.query(Submission).filter(Submission.is_daily == True,
        Submission.submitted_at >= datetime(today.year, today.month, today.day)).all()
    leaderboard = []
    for s in subs:
        r = db.query(AnalysisResult).filter(AnalysisResult.submission_id == s.submission_id).first()
        u = db.query(User).filter(User.user_id == s.user_id).first()
        if r and u:
            leaderboard.append({"username": u.username, "avatar_url": u.avatar_url,
                                 "final_score": r.final_score, "grade": r.grade})
    leaderboard.sort(key=lambda x: x["final_score"], reverse=True)
    already_submitted = any(s.user_id == current_user.user_id for s in subs)
    return {"topic": topic.title, "topic_id": topic.topic_id, "niche": topic.niche,
            "duration": 600, "leaderboard": leaderboard[:20], "already_submitted": already_submitted}


class DailySubmitBody(BaseModel):
    content: str
    draft: bool = False


@router.post("/daily-challenge/submit")
def submit_daily_challenge(body: DailySubmitBody, db: Session = Depends(get_db),
                           current_user: User = Depends(get_current_user)):
    """Dedicated daily-challenge submission — previously this piggybacked on
    POST /rooms/{room_id}/submit using whichever room the API happened to
    list first (rooms.data[0] on the frontend), which broke silently if room
    ordering ever changed, and never set is_daily=True, so the daily
    leaderboard above was always empty regardless of who'd actually played."""
    topic = _get_or_create_daily_topic(db)
    sub = Submission(
        submission_id=str(uuid.uuid4()),
        session_id=None,
        user_id=current_user.user_id,
        content=body.content,
        word_count=len(body.content.split()),
        niche=topic.niche,
        topic_title=topic.title,
        is_daily=True,
        is_public=False,
        submitted_at=datetime.utcnow(),
    )
    db.add(sub)
    db.commit()
    if not body.draft:
        from app.services.session_service import trigger_nlp_and_award
        from app.db.database import SessionLocal
        trigger_nlp_and_award(sub.submission_id, SessionLocal)
    return {"submission_id": sub.submission_id, "message": "Submitted"}

def _t_out(t: Tournament) -> dict:
    return {"tournament_id": t.tournament_id, "name": t.name, "type": t.type,
            "status": t.status, "starts_at": t.starts_at, "ends_at": t.ends_at,
            "description": t.description, "entry_fee": t.entry_fee or 0,
            "currency": t.currency or "PKR", "prize_pool": t.prize_pool or 0}


@router.get("/{tournament_id}")
def tournament_detail(tournament_id: str, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    from app.db.models import TournamentEntry
    t = db.query(Tournament).filter(Tournament.tournament_id == tournament_id).first()
    if not t:
        from fastapi import HTTPException
        raise HTTPException(404, "Tournament not found")
    entries = db.query(TournamentEntry).filter(TournamentEntry.tournament_id == tournament_id,
                                               TournamentEntry.paid == True).all()
    parts = []
    joined = False
    for e in entries:
        u = db.query(User).filter(User.user_id == e.user_id).first()
        if u:
            parts.append({"username": u.username, "avatar_url": u.avatar_url, "best_score": e.best_score})
        if e.user_id == current_user.user_id:
            joined = True
    parts.sort(key=lambda x: x["best_score"], reverse=True)
    out = _t_out(t)
    out.update({"participants": parts, "participant_count": len(parts),
                "payout": (t.prize_pool or 0) // 2, "joined": joined})
    return out


@router.post("/{tournament_id}/join")
def join_tournament(tournament_id: str, provider: str = "jazzcash", currency: str = "PKR",
                    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Start the entry-fee payment. On confirm, the user is entered and the
    prize pool grows (payout at close = half the pool)."""
    from fastapi import HTTPException
    from app.db.models import TournamentEntry
    from app.services import payment_service
    t = db.query(Tournament).filter(Tournament.tournament_id == tournament_id).first()
    if not t:
        raise HTTPException(404, "Tournament not found")
    if t.status == "ended":
        raise HTTPException(400, "This tournament has ended.")
    existing = db.query(TournamentEntry).filter(TournamentEntry.tournament_id == tournament_id,
                                                TournamentEntry.user_id == current_user.user_id,
                                                TournamentEntry.paid == True).first()
    if existing:
        raise HTTPException(400, "You've already joined this tournament.")
    fee = t.entry_fee or 0
    if fee == 0:                          # free tournament — join immediately
        entry = TournamentEntry(tournament_id=tournament_id, user_id=current_user.user_id, paid=True)
        db.add(entry); db.commit()
        return {"free": True, "joined": True}
    amount = payment_service.price_in(currency, fee)
    p = payment_service.create_payment(db, current_user.user_id, "tournament_entry", amount,
                                       provider, currency, ref_id=tournament_id)
    return {"free": False, "payment": {"payment_id": p.payment_id, "amount": p.amount,
            "currency": p.currency, "provider": p.provider, "txn_ref": p.txn_ref},
            "checkout": payment_service.checkout_payload(p)}
