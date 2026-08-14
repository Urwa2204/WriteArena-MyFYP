from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User, Submission, AnalysisResult, Session as GameSession
from app.core.dependencies import get_current_user
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/me")
def my_analytics(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    subs = db.query(Submission).filter(Submission.user_id == current_user.user_id).order_by(Submission.submitted_at).all()
    timeline = []
    for s in subs:
        r = db.query(AnalysisResult).filter(AnalysisResult.submission_id == s.submission_id).first()
        timeline.append({
            "date": s.submitted_at.strftime("%Y-%m-%d"),
            "xp": 0,
            "final_score": r.final_score if r else 0,
            "plagiarism": r.plagiarism_score if r else 0,
            "ai_score": r.ai_score if r else 0,
            "quality": r.quality_score if r else 0,
        })
    heatmap = {}
    for s in subs:
        key = s.submitted_at.strftime("%Y-%m-%d")
        heatmap[key] = heatmap.get(key, 0) + 1
    avg = lambda vals: round(sum(vals)/len(vals), 2) if vals else 0
    scores = [t["final_score"] for t in timeline if t["final_score"]]

    # "speed" — real words-per-minute from timed (room) submissions, scaled
    # against a ~40wpm benchmark. Solo Writing entries are untimed practice,
    # so they're excluded from this specific measure. Previously this was a
    # hardcoded 70 for every user regardless of any of their actual data.
    speed_samples = []
    for s in subs:
        if not s.session_id or not s.word_count:
            continue
        sess = db.query(GameSession).filter(GameSession.session_id == s.session_id).first()
        if sess and sess.started_at:
            minutes = max(0.5, (s.submitted_at - sess.started_at).total_seconds() / 60)
            speed_samples.append(s.word_count / minutes)
    speed = min(100, round((avg(speed_samples) / 40) * 100)) if speed_samples else 0

    # "consistency" — regularity of submission dates (small, steady gaps
    # score higher than the same total volume crammed sporadically),
    # not just a raw count of sessions relabeled as "consistency."
    dates = sorted(set(s.submitted_at.date() for s in subs))
    if len(dates) >= 2:
        gaps = [(dates[i + 1] - dates[i]).days for i in range(len(dates) - 1)]
        avg_gap = sum(gaps) / len(gaps)
        variance = sum((g - avg_gap) ** 2 for g in gaps) / len(gaps)
        consistency = max(0, min(100, round(100 - variance * 5 - avg_gap * 3)))
    elif len(dates) == 1:
        consistency = 20
    else:
        consistency = 0

    radar = {
        "originality": avg([100*(1-t["plagiarism"]) for t in timeline]),
        "authenticity": avg([100*(1-t["ai_score"]) for t in timeline]),
        "quality": avg([100*t["quality"] for t in timeline]),
        "consistency": consistency,
        "speed": speed,
    }
    return {"timeline": timeline, "heatmap": heatmap, "radar": radar,
            "total_sessions": len(subs), "avg_score": avg(scores)}
