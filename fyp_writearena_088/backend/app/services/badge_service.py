from sqlalchemy.orm import Session
from app.db.models import Badge, UserBadge, User, Submission, AnalysisResult
from datetime import datetime

DEFAULT_BADGES = [
    {"name": "First Draft", "description": "Complete your first writing session", "icon": "pen", "rarity": "common", "condition": "sessions", "threshold": 1},
    {"name": "Wordsmith", "description": "Complete 10 writing sessions", "icon": "book", "rarity": "common", "condition": "sessions", "threshold": 10},
    {"name": "Veteran", "description": "Complete 50 writing sessions", "icon": "star", "rarity": "rare", "condition": "sessions", "threshold": 50},
    {"name": "Perfectionist", "description": "Score 95 or above in a session", "icon": "trophy", "rarity": "rare", "condition": "score_95", "threshold": 1},
    {"name": "Gold Standard", "description": "Score 100 in a session", "icon": "crown", "rarity": "epic", "condition": "score_100", "threshold": 1},
    {"name": "Streak Starter", "description": "Maintain a 7-day streak", "icon": "fire", "rarity": "common", "condition": "streak", "threshold": 7},
    {"name": "On Fire", "description": "Maintain a 30-day streak", "icon": "flame", "rarity": "rare", "condition": "streak", "threshold": 30},
    {"name": "Influencer", "description": "Get 50 followers", "icon": "users", "rarity": "rare", "condition": "followers", "threshold": 50},
    {"name": "Scholar", "description": "Reach 10,000 XP", "icon": "academic", "rarity": "epic", "condition": "xp", "threshold": 10000},
]

def seed_badges(db: Session):
    for b in DEFAULT_BADGES:
        existing = db.query(Badge).filter(Badge.name == b["name"]).first()
        if not existing:
            db.add(Badge(**b))
    db.commit()

def check_and_award_badges(user: User, db: Session) -> list:
    awarded = []
    all_badges = db.query(Badge).all()
    existing_ids = {ub.badge_id for ub in user.badges}
    session_count = len(user.submissions)
    followers_count = db.execute(
        __import__("sqlalchemy").text("SELECT COUNT(*) FROM follows WHERE following_id = :uid"),
        {"uid": user.user_id}
    ).scalar()

    for badge in all_badges:
        if badge.badge_id in existing_ids:
            continue
        earned = False
        if badge.condition == "sessions" and session_count >= badge.threshold:
            earned = True
        elif badge.condition == "streak" and user.streak_count >= badge.threshold:
            earned = True
        elif badge.condition == "followers" and followers_count >= badge.threshold:
            earned = True
        elif badge.condition == "xp" and user.xp_points >= badge.threshold:
            earned = True
        elif badge.condition == "score_95":
            best = db.query(AnalysisResult).join(Submission).filter(
                Submission.user_id == user.user_id, AnalysisResult.final_score >= 95
            ).first()
            earned = best is not None
        elif badge.condition == "score_100":
            perfect = db.query(AnalysisResult).join(Submission).filter(
                Submission.user_id == user.user_id, AnalysisResult.final_score >= 99.9
            ).first()
            earned = perfect is not None
        if earned:
            db.add(UserBadge(user_id=user.user_id, badge_id=badge.badge_id))
            awarded.append(badge.name)
    if awarded:
        db.commit()
    return awarded
