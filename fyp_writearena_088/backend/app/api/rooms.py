from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Room, RoomMember, Session as GameSession, Topic, Submission, AnalysisResult, User
from app.core.dependencies import get_current_user
from app.services.session_service import trigger_nlp_and_award
from app.db.database import SessionLocal
from pydantic import BaseModel
from datetime import datetime
import uuid

router = APIRouter(prefix="/rooms", tags=["rooms"])

class SubmitBody(BaseModel):
    content: str
    draft: bool = False
    dnf: bool = False   # timer ran out with too little written to be worth scoring

@router.get("")
def list_rooms(db: Session = Depends(get_db)):
    rooms = db.query(Room).all()
    return [_room_out(r, db) for r in rooms]

@router.get("/{room_id}")
def get_room(room_id: str, db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.room_id == room_id).first()
    if not room: raise HTTPException(404, "Room not found")
    return _room_out(room, db)

@router.get("/{room_id}/session")
def get_active_session(room_id: str, db: Session = Depends(get_db)):
    """Current active session for a room, with server-computed remaining time.
    Lets the lobby/arena show the correct clock for late joiners and page refreshes."""
    room = db.query(Room).filter(Room.room_id == room_id).first()
    if not room:
        raise HTTPException(404, "Room not found")
    duration = room.session_duration or 300
    session = db.query(GameSession).filter(
        GameSession.room_id == room_id, GameSession.status == "active"
    ).first()
    session = _reap_if_expired(db, room, session)
    if not session:
        return {"active": False, "duration": duration}
    topic_title = "Write about anything you choose."
    if session.topic_id:
        topic = db.query(Topic).filter(Topic.topic_id == session.topic_id).first()
        if topic:
            topic_title = topic.title
    elapsed = 0
    if session.started_at:
        elapsed = int((datetime.utcnow() - session.started_at).total_seconds())
    remaining = max(0, duration - elapsed)
    return {
        "active": True,
        "session_id": session.session_id,
        "topic": topic_title,
        "duration": duration,
        "elapsed": elapsed,
        "remaining": remaining,
        "started_at": session.started_at.isoformat() + "Z" if session.started_at else None,
    }

@router.post("/{room_id}/join")
def join_room(room_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.room_id == room_id).first()
    if not room: raise HTTPException(404, "Room not found")
    count = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.role == "participant").count()
    if count >= room.capacity:
        raise HTTPException(403, "Room is full")
    existing = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.user_id == current_user.user_id).first()
    if not existing:
        db.add(RoomMember(room_id=room_id, user_id=current_user.user_id, role="participant"))
        db.commit()
    return {"message": "Joined", "room": _room_out(room, db)}

@router.post("/{room_id}/spectate")
def spectate_room(room_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.user_id == current_user.user_id).first()
    if existing:
        existing.role = "spectator"
    else:
        db.add(RoomMember(room_id=room_id, user_id=current_user.user_id, role="spectator"))
    db.commit()
    return {"message": "Spectating"}

@router.post("/{room_id}/submit")
def submit_writing(room_id: str, body: SubmitBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    room = db.query(Room).filter(Room.room_id == room_id).first()
    if not room: raise HTTPException(404, "Room not found")
    # Must have actually joined this room (as a participant) to submit into
    # it — otherwise anyone could post a scored entry into any room's active
    # session without ever having joined.
    member = db.query(RoomMember).filter(
        RoomMember.room_id == room_id, RoomMember.user_id == current_user.user_id,
        RoomMember.role == "participant",
    ).first()
    if not member:
        raise HTTPException(403, "Join this room before submitting.")
    session = db.query(GameSession).filter(GameSession.room_id == room_id, GameSession.status == "active").first()
    topic_title = ""
    niche = room.niche
    if session and session.topic_id:
        topic = db.query(Topic).filter(Topic.topic_id == session.topic_id).first()
        if topic: topic_title = topic.title
    # A genuine DNF (timer ran out with too little written) is recorded as
    # its own state rather than the old behavior of scoring the literal
    # string "No submission" as if it were the writer's actual entry.
    is_dnf = body.dnf or not body.content.strip()
    sub = Submission(
        submission_id=str(uuid.uuid4()),
        session_id=session.session_id if session else None,
        user_id=current_user.user_id,
        content="" if is_dnf else body.content,
        word_count=0 if is_dnf else len(body.content.split()),
        is_dnf=is_dnf,
        niche=niche,
        topic_title=topic_title,
        submitted_at=datetime.utcnow(),
    )
    db.add(sub)
    db.commit()
    if not body.draft and not is_dnf:
        trigger_nlp_and_award(sub.submission_id, SessionLocal)
    return {"submission_id": sub.submission_id, "message": "DNF" if is_dnf else "Submitted", "is_dnf": is_dnf}

def _reap_if_expired(db: Session, room: Room, session):
    """A session with no explicit end_session call (closed tab, server
    restart mid-session, etc.) would otherwise stay 'active' forever — there
    is no background timer, so the very next read of this room checks
    whether its clock has actually run out and, if so, ends it right here.
    Small grace period so a session doesn't get reaped mid-submission."""
    if not session or not session.started_at:
        return session
    duration = room.session_duration or 300
    elapsed = (datetime.utcnow() - session.started_at).total_seconds()
    if elapsed > duration + 30:
        session.status = "ended"
        session.ended_at = datetime.utcnow()
        room.status = "idle"
        db.commit()
        return None
    return session


def _room_out(r: Room, db: Session) -> dict:
    member_count = db.query(RoomMember).filter(RoomMember.room_id == r.room_id, RoomMember.role == "participant").count()
    session = db.query(GameSession).filter(GameSession.room_id == r.room_id, GameSession.status == "active").first()
    session = _reap_if_expired(db, r, session)
    duration = r.session_duration or 300
    remaining = None
    started_at = None
    if session and session.started_at:
        started_at = session.started_at.isoformat() + "Z"
        remaining = max(0, duration - int((datetime.utcnow() - session.started_at).total_seconds()))
    return {"room_id": r.room_id, "name": r.name, "niche": r.niche, "description": r.description,
            "status": r.status, "capacity": r.capacity, "member_count": member_count,
            "session_duration": duration,
            "active_session_id": session.session_id if session else None,
            "session_started_at": started_at,
            "session_remaining": remaining}
