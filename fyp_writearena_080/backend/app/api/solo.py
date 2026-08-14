from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.db.database import get_db, SessionLocal
from app.db.models import Submission, AnalysisResult, User
from app.core.dependencies import get_current_user
from app.services.session_service import trigger_nlp_and_award
from app.nlp.english import english_word_ratio

router = APIRouter(prefix="/solo", tags=["solo"])


class SoloBody(BaseModel):
    content: str
    niche: str = "literature"
    topic_title: str = "Solo practice"
    is_public: bool = False


@router.post("/submit")
def solo_submit(body: SoloBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Non-competitive solo writing from the dashboard. Works offline (local NLP /
    Ollama coach). Scored the same way as a room submission, so it still earns XP,
    streaks and badges — it just isn't tied to a live session."""
    if len(body.content.split()) < 5:
        raise HTTPException(400, "Write a bit more before submitting.")
    # Reject keyboard-mash / gibberish before it ever reaches scoring — proper
    # English words only. (english_word_ratio uses a real dictionary.)
    ratio, real, total = english_word_ratio(body.content)
    if total >= 5 and ratio < 0.5:
        raise HTTPException(400, "This doesn't look like real writing yet — please write in proper English words.")
    sub = Submission(
        submission_id=str(uuid.uuid4()),
        session_id=None,                 # solo = no competitive session
        user_id=current_user.user_id,
        content=body.content,
        word_count=len(body.content.split()),
        niche=body.niche,
        topic_title=body.topic_title,
        is_public=body.is_public,
        submitted_at=datetime.utcnow(),
    )
    db.add(sub)
    db.commit()
    trigger_nlp_and_award(sub.submission_id, SessionLocal)
    return {"submission_id": sub.submission_id, "message": "Scored"}
