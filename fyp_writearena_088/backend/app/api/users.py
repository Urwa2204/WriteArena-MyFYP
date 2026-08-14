from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import User, Follow, UserBadge, Badge, Submission, AnalysisResult, XpEvent, Notification
from app.core.dependencies import get_current_user
from typing import Optional
from datetime import datetime, timedelta

router = APIRouter(prefix="/users", tags=["users"])

class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    pen_name: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    website: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    interests: Optional[list] = None

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _user_full(current_user, db, current_user)

@router.patch("/me")
def update_me(body: ProfileUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if body.display_name is not None: current_user.display_name = body.display_name
    if body.pen_name is not None: current_user.pen_name = body.pen_name
    if body.bio is not None: current_user.bio = body.bio
    if body.age is not None: current_user.age = body.age
    if body.location is not None: current_user.location = body.location
    if body.website is not None: current_user.website = body.website
    if body.avatar_url is not None: current_user.avatar_url = body.avatar_url
    if body.cover_url is not None: current_user.cover_url = body.cover_url
    if body.interests is not None: current_user.interests = ",".join(body.interests)
    db.commit()
    db.refresh(current_user)
    return _user_full(current_user, db, current_user)

@router.get("/leaderboard")
def leaderboard(db: Session = Depends(get_db), limit: int = 50, scope: str = "all"):
    """scope: 'all' (lifetime xp_points), 'week', or 'month' — the scoped
    views sum actual XP earned within that window (via the XpEvent ledger),
    not the all-time total re-labeled. Previously the frontend's week/month
    tabs changed nothing because this endpoint ignored scope entirely."""
    if scope in ("week", "month"):
        since = datetime.utcnow() - (timedelta(days=7) if scope == "week" else timedelta(days=30))
        rows = (db.query(XpEvent.user_id, func.sum(XpEvent.amount).label("period_xp"))
                .filter(XpEvent.created_at >= since)
                .group_by(XpEvent.user_id)
                .order_by(func.sum(XpEvent.amount).desc())
                .limit(limit).all())
        out = []
        for uid, period_xp in rows:
            u = db.query(User).filter(User.user_id == uid, User.status == "active").first()
            if u:
                d = _user_basic(u)
                d["xp_points"] = int(period_xp)  # show period XP here, not the all-time total
                out.append(d)
        return out
    users = db.query(User).filter(User.status == "active").order_by(User.xp_points.desc()).limit(limit).all()
    return [_user_basic(u) for u in users]

@router.get("/search")
def search_users(q: str = "", current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Find other writers by username, display name, or pen name."""
    from sqlalchemy import or_
    term = (q or "").strip()
    if len(term) < 1:
        return []
    like = f"%{term}%"
    rows = (db.query(User)
            .filter(User.status == "active",
                    or_(User.username.ilike(like), User.display_name.ilike(like), User.pen_name.ilike(like)))
            .order_by(User.xp_points.desc()).limit(10).all())
    return [{"user_id": u.user_id, "username": u.username, "display_name": u.display_name,
             "pen_name": u.pen_name, "avatar_url": u.avatar_url, "xp_points": u.xp_points,
             "rank": u.rank} for u in rows if u.user_id != current_user.user_id]


@router.get("/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user = db.query(User).filter(User.user_id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    return _user_full(user, db, current_user)

@router.post("/{user_id}/follow")
def follow_user(user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_id == current_user.user_id:
        raise HTTPException(400, "Cannot follow yourself")
    existing = db.query(Follow).filter(Follow.follower_id == current_user.user_id, Follow.following_id == user_id).first()
    if existing:
        raise HTTPException(400, "Already following")
    db.add(Follow(follower_id=current_user.user_id, following_id=user_id))
    db.add(Notification(user_id=user_id, type="follow",
                        message=f"{current_user.display_name or current_user.username} started following you"))
    db.commit()
    return {"message": "Following"}

@router.delete("/{user_id}/follow")
def unfollow_user(user_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    follow = db.query(Follow).filter(Follow.follower_id == current_user.user_id, Follow.following_id == user_id).first()
    if not follow:
        raise HTTPException(404, "Not following")
    db.delete(follow)
    db.commit()
    return {"message": "Unfollowed"}

@router.get("/{user_id}/badges")
def user_badges(user_id: str, db: Session = Depends(get_db)):
    # Previously this only returned earned UserBadge rows, so an unearned
    # badge never appeared at all — no dimmed medallion, no hint, nothing.
    # Now every badge is returned with its earned status (if any) and a
    # plain-language description of what actually unlocks it.
    all_badges = db.query(Badge).all()
    earned_map = {ub.badge_id: ub.awarded_at
                  for ub in db.query(UserBadge).filter(UserBadge.user_id == user_id).all()}
    result = []
    for b in all_badges:
        result.append({"badge_id": b.badge_id, "name": b.name, "description": b.description,
                       "icon": b.icon, "rarity": b.rarity, "awarded_at": earned_map.get(b.badge_id),
                       "unlock_hint": _badge_unlock_hint(b)})
    return result

def _badge_unlock_hint(b: Badge) -> str:
    n = b.threshold or 1
    hints = {
        "sessions": f"Complete {n} writing session{'s' if n != 1 else ''}",
        "streak": f"Reach a {n}-day writing streak",
        "followers": f"Get {n} follower{'s' if n != 1 else ''}",
        "xp": f"Reach {n:,} XP",
        "score_95": "Score 95 or above in a session",
        "score_100": "Score 100 in a session",
    }
    return hints.get(b.condition, "Keep writing to unlock this.")

@router.get("/{user_id}/history")
def user_history(user_id: str, db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.user_id == user_id).order_by(Submission.submitted_at.desc()).limit(20).all()
    return [_sub_out(s, db) for s in subs]

def _user_basic(u: User) -> dict:
    return {"user_id": u.user_id, "username": u.username, "display_name": u.display_name,
            "pen_name": u.pen_name, "avatar_url": u.avatar_url, "xp_points": u.xp_points,
            "level": u.level, "rank": u.rank, "streak_count": u.streak_count}

def _user_full(u: User, db: Session, viewer: User) -> dict:
    followers = db.execute(text("SELECT COUNT(*) FROM follows WHERE following_id=:id"), {"id": u.user_id}).scalar()
    following = db.execute(text("SELECT COUNT(*) FROM follows WHERE follower_id=:id"), {"id": u.user_id}).scalar()
    is_following = False
    if viewer and viewer.user_id != u.user_id:
        is_following = db.query(Follow).filter(Follow.follower_id == viewer.user_id, Follow.following_id == u.user_id).first() is not None
    sessions_count = db.query(Submission).filter(Submission.user_id == u.user_id).count()
    return {**_user_basic(u), "email": u.email if viewer and viewer.user_id == u.user_id else None,
            "bio": u.bio, "age": u.age, "location": u.location, "website": u.website,
            "cover_url": u.cover_url, "interests": u.interests,
            "followers_count": followers, "following_count": following,
            "sessions_count": sessions_count, "is_following": is_following,
            "created_at": u.created_at, "role": u.role}

def _sub_out(s: Submission, db: Session) -> dict:
    result = db.query(AnalysisResult).filter(AnalysisResult.submission_id == s.submission_id).first()
    return {"submission_id": s.submission_id, "topic_title": s.topic_title, "niche": s.niche,
            "word_count": s.word_count, "submitted_at": s.submitted_at,
            "final_score": result.final_score if result else None,
            "grade": result.grade if result else None}
