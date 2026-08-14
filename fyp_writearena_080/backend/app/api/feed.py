from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Submission, AnalysisResult, User, Like, Comment, Follow
from app.core.dependencies import get_current_user
from typing import Optional

router = APIRouter(prefix="/feed", tags=["feed"])

@router.get("/explore")
def explore(niche: Optional[str] = None, sort: str = "top", page: int = 1,
            db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    q = db.query(Submission).filter(Submission.is_public == True)
    if niche:
        q = q.filter(Submission.niche == niche)
    subs = q.order_by(Submission.submitted_at.desc()).offset((page-1)*20).limit(20).all()
    items = [_sub_card(s, db, current_user) for s in subs]
    if sort == "top":
        items.sort(key=lambda x: x.get("final_score") or 0, reverse=True)
    return {"items": items, "page": page}

@router.get("/following")
def following_feed(page: int = 1, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    following_ids = [f.following_id for f in db.query(Follow).filter(Follow.follower_id == current_user.user_id).all()]
    if not following_ids:
        return {"items": [], "page": page}
    subs = db.query(Submission).filter(
        Submission.user_id.in_(following_ids), Submission.is_public == True
    ).order_by(Submission.submitted_at.desc()).offset((page-1)*20).limit(20).all()
    return {"items": [_sub_card(s, db, current_user) for s in subs], "page": page}

@router.get("/submission/{submission_id}")
def get_submission(submission_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sub = db.query(Submission).filter(Submission.submission_id == submission_id).first()
    if not sub: return {"error": "Not found"}
    # The list endpoints above already filter to is_public — this single-item
    # lookup didn't, which meant a private Solo Writing submission was
    # readable by anyone who had (or guessed) its ID. Only the owner can view
    # their own private submissions here.
    if not sub.is_public and sub.user_id != current_user.user_id:
        raise HTTPException(404, "Not found")
    card = _sub_card(sub, db, current_user)
    card["content"] = sub.content
    result = db.query(AnalysisResult).filter(AnalysisResult.submission_id == submission_id).first()
    if result:
        card["plagiarism_score"] = result.plagiarism_score
        card["ai_score"] = result.ai_score
        card["quality_score"] = result.quality_score
        card["relevance_score"] = result.relevance_score
        card["ai_feedback"] = result.ai_feedback
        # Only the author sees which of their own submissions this one was
        # flagged as similar to — previously computed by the plagiarism
        # check but silently discarded, so a flagged writer had no way to
        # see why. Kept owner-only and without naming the other author, to
        # surface the match without turning it into a public callout.
        if result.flagged_phrases and sub.user_id == current_user.user_id:
            flagged = (db.query(Submission)
                       .filter(Submission.submission_id.in_(result.flagged_phrases))
                       .all())
            card["flagged_similar_to"] = [
                {"submission_id": f.submission_id, "niche": f.niche, "topic_title": f.topic_title,
                 "excerpt": (f.content[:120] + "...") if len(f.content) > 120 else f.content}
                for f in flagged
            ]
    comments = db.query(Comment).filter(Comment.submission_id == submission_id).order_by(Comment.created_at).all()
    card["comments"] = [_comment_out(c, db) for c in comments]
    return card

def _sub_card(s: Submission, db: Session, viewer: User) -> dict:
    result = db.query(AnalysisResult).filter(AnalysisResult.submission_id == s.submission_id).first()
    author = db.query(User).filter(User.user_id == s.user_id).first()
    like_count = db.query(Like).filter(Like.submission_id == s.submission_id).count()
    comment_count = db.query(Comment).filter(Comment.submission_id == s.submission_id).count()
    user_liked = db.query(Like).filter(Like.submission_id == s.submission_id, Like.user_id == viewer.user_id).first() is not None if viewer else False
    excerpt = s.content[:200] + "..." if len(s.content) > 200 else s.content
    return {
        "submission_id": s.submission_id, "niche": s.niche, "topic_title": s.topic_title,
        "excerpt": excerpt, "word_count": s.word_count, "submitted_at": s.submitted_at,
        "is_dnf": s.is_dnf,
        "final_score": result.final_score if result else None,
        "grade": result.grade if result else None,
        "author": {"user_id": author.user_id, "username": author.username,
                   "display_name": author.display_name, "pen_name": author.pen_name,
                   "avatar_url": author.avatar_url, "rank": author.rank} if author else None,
        "like_count": like_count, "comment_count": comment_count, "user_liked": user_liked,
    }

def _comment_out(c, db: Session) -> dict:
    u = db.query(User).filter(User.user_id == c.user_id).first()
    return {"comment_id": c.comment_id, "body": c.body, "created_at": c.created_at,
            "author": {"username": u.username, "avatar_url": u.avatar_url} if u else None}
