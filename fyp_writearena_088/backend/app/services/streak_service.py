from sqlalchemy.orm import Session
from app.db.models import User, StreakFreeze
from datetime import datetime, timedelta

def update_streak(user: User, db: Session):
    now = datetime.utcnow()
    last = user.last_active
    if last is None:
        user.streak_count = 1
    else:
        diff = (now.date() - last.date()).days
        if diff == 0:
            pass
        elif diff == 1:
            user.streak_count = (user.streak_count or 0) + 1
        else:
            freeze = db.query(StreakFreeze).filter(
                StreakFreeze.user_id == user.user_id,
                StreakFreeze.expires_at > now
            ).first()
            if freeze and diff <= 2:
                db.delete(freeze)
            else:
                user.streak_count = 1
    user.last_active = now
    _update_rank(user)
    db.commit()

def _update_rank(user: User):
    xp = user.xp_points or 0
    if xp >= 50000:
        user.rank = "diamond"
    elif xp >= 20000:
        user.rank = "platinum"
    elif xp >= 8000:
        user.rank = "gold"
    elif xp >= 2000:
        user.rank = "silver"
    else:
        user.rank = "bronze"
    user.level = max(1, xp // 500 + 1)
