import logging

from sqlalchemy.orm import Session as DBSession
from app.db.models import Session, Submission, User, Room, Notification, XpEvent, FailedJob
from app.nlp.scorer import compute_score
from app.services.badge_service import check_and_award_badges
from app.services.streak_service import update_streak
from app.services import task_queue
from datetime import datetime

logger = logging.getLogger("writearena.scoring")


def _score_and_award(submission_id: str, db_factory):
    """The actual scoring work — runs on the bounded task queue, retried a
    few times on failure before giving up (see task_queue.submit)."""
    db = db_factory()
    try:
        sub = db.query(Submission).filter(Submission.submission_id == submission_id).first()
        if not sub:
            return
        result = compute_score(sub.content, sub.submission_id, db)
        xp_gained = max(10, int(result.final_score / 2))
        user = db.query(User).filter(User.user_id == sub.user_id).first()
        if user:
            user.xp_points = (user.xp_points or 0) + xp_gained
            db.add(XpEvent(user_id=user.user_id, amount=xp_gained))
            update_streak(user, db)
            new_badges = check_and_award_badges(user, db)
            if new_badges:
                for badge_name in new_badges:
                    notif = Notification(
                        user_id=user.user_id,
                        type="badge",
                        message=f"You earned the badge: {badge_name}"
                    )
                    db.add(notif)
            db.commit()
    finally:
        db.close()


def trigger_nlp_and_award(submission_id: str, db_factory):
    """Queue NLP scoring for a submission on the bounded background task
    pool. Previously this spun up one raw, uncapped threading.Thread per
    submission with no retry — a crash mid-scoring just vanished silently
    and a room where everyone submitted at once had no concurrency limit."""
    def _record_permanent_failure(exc):
        db = db_factory()
        try:
            db.add(FailedJob(task_name="score_submission", payload=submission_id, error=str(exc)))
            db.commit()
        except Exception:
            logger.exception("could not even record the failed job for submission %s", submission_id)
        finally:
            db.close()

    task_queue.submit(_score_and_award, submission_id, db_factory,
                      on_permanent_failure=_record_permanent_failure)
