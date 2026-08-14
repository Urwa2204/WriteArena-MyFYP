from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import User, Room, Topic, Tournament, Submission, AnalysisResult, TournamentEntry, Report, Comment
from app.core.dependencies import require_admin
from typing import Optional
import uuid, random
from datetime import datetime, timedelta

router = APIRouter(prefix="/admin", tags=["admin"])

class RoomCreate(BaseModel):
    name: str
    niche: str
    description: Optional[str] = ""
    capacity: int = 10
    session_duration: int = 300

class TopicCreate(BaseModel):
    title: str
    niche: str

class TournamentCreate(BaseModel):
    name: str
    type: str = "weekly"                 # weekly | bracket | daily
    description: Optional[str] = ""
    entry_fee: int = 150                 # PKR; 0 = free
    currency: str = "PKR"
    starts_at: Optional[str] = None      # ISO date/datetime
    ends_at: Optional[str] = None

def _parse_dt(v):
    if not v:
        return None
    try:
        return datetime.fromisoformat(v.replace("Z", ""))
    except Exception:
        return None

@router.post("/tournaments", status_code=201)
def announce_tournament(body: TournamentCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    starts = _parse_dt(body.starts_at) or datetime.utcnow()
    ends = _parse_dt(body.ends_at) or (starts + timedelta(days=7))
    if ends <= starts:
        raise HTTPException(400, "End date must be after the start date.")
    status = "active" if starts <= datetime.utcnow() <= ends else ("upcoming" if starts > datetime.utcnow() else "ended")
    t = Tournament(
        tournament_id=str(uuid.uuid4()),
        name=body.name,
        type=body.type if body.type in ("weekly", "bracket", "daily") else "weekly",
        status=status,
        description=body.description,
        entry_fee=max(0, body.entry_fee),
        currency=body.currency,
        prize_pool=0,
        starts_at=starts,
        ends_at=ends,
    )
    db.add(t); db.commit(); db.refresh(t)
    return {"tournament_id": t.tournament_id, "name": t.name, "status": t.status,
            "entry_fee": t.entry_fee, "currency": t.currency}

@router.post("/tournaments/{tournament_id}/close")
def close_tournament(tournament_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """End a tournament and pick the winner (highest best_score). Prize = half the pool."""
    t = db.query(Tournament).filter(Tournament.tournament_id == tournament_id).first()
    if not t:
        raise HTTPException(404, "Tournament not found")
    entries = db.query(TournamentEntry).filter(TournamentEntry.tournament_id == tournament_id,
                                               TournamentEntry.paid == True).order_by(TournamentEntry.best_score.desc()).all()
    t.status = "ended"
    payout = (t.prize_pool or 0) // 2
    if entries:
        t.winner_id = entries[0].user_id
    db.commit()
    winner = db.query(User).filter(User.user_id == t.winner_id).first() if t.winner_id else None
    return {"tournament_id": t.tournament_id, "winner": winner.username if winner else None,
            "prize_pool": t.prize_pool, "payout": payout, "participants": len(entries)}

@router.get("/stats")
def stats(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return {
        "total_users": db.query(User).count(),
        "active_users": db.query(User).filter(User.status == "active").count(),
        "total_submissions": db.query(Submission).count(),
        "total_rooms": db.query(Room).count(),
    }

@router.get("/users")
def list_users(page: int = 1, q: str = "", db: Session = Depends(get_db), admin=Depends(require_admin)):
    query = db.query(User)
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter((User.username.ilike(like)) | (User.email.ilike(like)))
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page-1)*50).limit(50).all()
    return {"users": [{"user_id": u.user_id, "username": u.username, "email": u.email,
             "role": u.role, "status": u.status, "xp_points": u.xp_points,
             "created_at": u.created_at} for u in users],
            "page": page, "total": total, "pages": max(1, (total + 49) // 50)}

@router.patch("/users/{user_id}/role")
def set_role(user_id: str, role: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(User).filter(User.user_id == user_id).first()
    if not u: raise HTTPException(404, "User not found")
    u.role = role
    db.commit()
    return {"ok": True}

@router.patch("/users/{user_id}/status")
def set_status(user_id: str, status: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    u = db.query(User).filter(User.user_id == user_id).first()
    if not u: raise HTTPException(404, "User not found")
    u.status = status
    db.commit()
    return {"ok": True}

@router.get("/rooms")
def list_rooms(db: Session = Depends(get_db), admin=Depends(require_admin)):
    return [{"room_id": r.room_id, "name": r.name, "niche": r.niche, "status": r.status,
             "capacity": r.capacity} for r in db.query(Room).all()]

@router.post("/rooms", status_code=201)
def create_room(body: RoomCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    r = Room(room_id=str(uuid.uuid4()), **body.dict())
    db.add(r)
    db.commit()
    return {"room_id": r.room_id}

@router.delete("/rooms/{room_id}")
async def delete_room(room_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    r = db.query(Room).filter(Room.room_id == room_id).first()
    if not r:
        return {"ok": True}
    # Previously this deleted the row outright with no regard for a session
    # in progress — the room (and, via cascade, its session and every
    # submission written in it) would vanish out from under active writers
    # with no explanation and no way to recover their work. Now: detach any
    # submissions from the session first (so the cascade delete can't take
    # them down too), end the session properly, and tell anyone connected.
    from app.db.models import Session as GameSession, Submission
    from app.services.ws_manager import manager
    session = db.query(GameSession).filter(GameSession.room_id == room_id, GameSession.status == "active").first()
    if session:
        subs = db.query(Submission).filter(Submission.session_id == session.session_id).all()
        for s in subs:
            s.session_id = None  # detach — preserved as a standalone submission, not lost
        session.status = "ended"
        session.ended_at = datetime.utcnow()
        db.commit()
        try:
            await manager.broadcast_room(room_id, {
                "type": "error",
                "message": "This room was removed by an admin. The session has ended — anything already "
                           "submitted is safe, but the timer has stopped and the room itself is gone.",
            })
        except Exception:
            pass  # best-effort notification; deletion proceeds either way
    db.delete(r)
    db.commit()
    return {"ok": True}

@router.post("/topics", status_code=201)
def create_topic(body: TopicCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    t = Topic(topic_id=str(uuid.uuid4()), title=body.title, niche=body.niche, approved=True)
    db.add(t)
    db.commit()
    return {"topic_id": t.topic_id}

@router.post("/topics/generate")
def generate_topics(niche: str = "technology", db: Session = Depends(get_db), admin=Depends(require_admin)):
    samples = {
        "technology": ["How will artificial intelligence reshape employment in the next decade?",
                       "Is social media doing more harm than good to society?",
                       "The ethical implications of facial recognition technology."],
        "society": ["What does community mean in an increasingly digital world?",
                    "The role of empathy in resolving modern political conflicts.",
                    "Has the concept of privacy become obsolete?"],
        "literature": ["What makes a story timeless?",
                       "The power of unreliable narrators in fiction.",
                       "How does language shape our understanding of the world?"],
        "science": ["Should gene editing in humans be permitted?",
                    "The relationship between scientific progress and ethical responsibility.",
                    "What does space exploration mean for humanity's future?"],
        "politics": ["Is democracy the best system of governance for the 21st century?",
                     "The balance between national security and civil liberties.",
                     "How should societies address historical injustices?"],
        "business": ["What responsibilities do corporations have beyond profit?",
                     "The future of remote work and its impact on cities.",
                     "How has entrepreneurship changed in the digital age?"],
    }
    pool = samples.get(niche, samples["technology"])
    created = []
    for title in pool:
        if not db.query(Topic).filter(Topic.title == title).first():
            t = Topic(topic_id=str(uuid.uuid4()), title=title, niche=niche, approved=True)
            db.add(t)
            created.append(title)
    db.commit()
    return {"created": len(created), "topics": created}


@router.get("/reports")
def list_reports(status: str = "open", db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Moderation queue. Enriches each report with a snippet of the actual
    flagged content and who posted it, so an admin doesn't have to look
    anything up by ID separately."""
    reports = (db.query(Report).filter(Report.status == status)
               .order_by(Report.created_at.desc()).limit(100).all())
    out = []
    for r in reports:
        reporter = db.query(User).filter(User.user_id == r.reporter_id).first()
        target_excerpt, target_author = None, None
        if r.target_type == "submission":
            sub = db.query(Submission).filter(Submission.submission_id == r.target_id).first()
            if sub:
                target_excerpt = sub.content[:200]
                author = db.query(User).filter(User.user_id == sub.user_id).first()
                target_author = author.username if author else None
        elif r.target_type == "comment":
            c = db.query(Comment).filter(Comment.comment_id == r.target_id).first()
            if c:
                target_excerpt = c.body[:200]
                author = db.query(User).filter(User.user_id == c.user_id).first()
                target_author = author.username if author else None
        else:
            # chat / other — the flagged text lives in the report reason itself;
            # the reporter is the account whose message triggered the filter.
            target_excerpt = r.reason
            target_author = reporter.username if reporter else None
        out.append({
            "report_id": r.report_id, "target_type": r.target_type, "target_id": r.target_id,
            "reason": r.reason, "created_at": r.created_at,
            "reporter": reporter.username if reporter else None,
            "target_excerpt": target_excerpt, "target_author": target_author,
            "target_still_exists": target_excerpt is not None,
        })
    return out


@router.post("/reports/{report_id}/dismiss")
def dismiss_report(report_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    r = db.query(Report).filter(Report.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    r.status = "dismissed"
    r.resolved_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.post("/reports/{report_id}/remove")
def remove_reported_content(report_id: str, db: Session = Depends(get_db), admin=Depends(require_admin)):
    """Delete the reported submission or comment and mark the report resolved."""
    r = db.query(Report).filter(Report.report_id == report_id).first()
    if not r:
        raise HTTPException(404, "Report not found")
    if r.target_type == "submission":
        target = db.query(Submission).filter(Submission.submission_id == r.target_id).first()
    else:
        target = db.query(Comment).filter(Comment.comment_id == r.target_id).first()
    if target:
        db.delete(target)
    r.status = "removed"
    r.resolved_at = datetime.utcnow()
    db.commit()
    return {"ok": True, "content_deleted": target is not None}
