from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Notification, User
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("")
def get_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    notifs = db.query(Notification).filter(Notification.user_id == current_user.user_id).order_by(Notification.created_at.desc()).limit(50).all()
    return [{"notification_id": n.notification_id, "type": n.type, "message": n.message,
             "is_read": n.is_read, "created_at": n.created_at} for n in notifs]

@router.patch("/{notif_id}/read")
def mark_read(notif_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.notification_id == notif_id, Notification.user_id == current_user.user_id).first()
    if n:
        n.is_read = True
        db.commit()
    return {"ok": True}

@router.patch("/read-all")
def mark_all_read(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == current_user.user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"ok": True}
