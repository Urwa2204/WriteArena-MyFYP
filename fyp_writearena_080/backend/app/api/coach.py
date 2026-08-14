from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.db.models import Subscription, User
from app.core.dependencies import get_current_user
from app.services import coach_service

router = APIRouter(prefix="/coach", tags=["coach"])


def _active_sub(db, user_id):
    now = datetime.utcnow()
    return (db.query(Subscription)
            .filter(Subscription.user_id == user_id, Subscription.plan == "coach",
                    Subscription.status == "active", Subscription.expires_at > now)
            .first())


@router.get("/status")
def status(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sub = _active_sub(db, current_user.user_id)
    return {"subscribed": bool(sub), "active_until": sub.expires_at.isoformat() if sub else None}


class SuggestBody(BaseModel):
    text: str


@router.post("/suggest")
def suggest(body: SuggestBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not _active_sub(db, current_user.user_id):
        raise HTTPException(402, "The AI writing coach is a paid feature. Subscribe to unlock it.")
    return coach_service.suggest(body.text)
