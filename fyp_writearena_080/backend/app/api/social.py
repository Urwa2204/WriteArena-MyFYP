from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import Like, Comment, Submission, Notification, User, Report, Message, Follow
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
from app.nlp.moderation import contains_abuse
import uuid

router = APIRouter(prefix="/social", tags=["social"])

class CommentBody(BaseModel):
    body: str

@router.post("/submissions/{sub_id}/like")
@limiter.limit("60/minute")
async def like(request: Request, sub_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing = db.query(Like).filter(Like.user_id == current_user.user_id, Like.submission_id == sub_id).first()
    if existing:
        db.delete(existing)
        db.commit()
        return {"liked": False}
    db.add(Like(user_id=current_user.user_id, submission_id=sub_id))
    sub = db.query(Submission).filter(Submission.submission_id == sub_id).first()
    if sub and sub.user_id != current_user.user_id:
        db.add(Notification(user_id=sub.user_id, type="like",
                            message=f"{current_user.username} liked your submission"))
    db.commit()
    return {"liked": True}

@router.post("/submissions/{sub_id}/comments")
@limiter.limit("20/minute")
async def comment(request: Request, sub_id: str, body: CommentBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    c = Comment(comment_id=str(uuid.uuid4()), submission_id=sub_id,
                user_id=current_user.user_id, body=body.body[:1000])
    db.add(c)
    # Auto-flag abusive language for admin review (the comment still posts;
    # a moderator can then remove it from the queue).
    if contains_abuse(body.body):
        db.add(Report(reporter_id=current_user.user_id, target_type="comment",
                      target_id=c.comment_id,
                      reason="Auto-flagged: abusive language detected in comment."))
    sub = db.query(Submission).filter(Submission.submission_id == sub_id).first()
    if sub and sub.user_id != current_user.user_id:
        db.add(Notification(user_id=sub.user_id, type="comment",
                            message=f"{current_user.username} commented on your submission"))
    db.commit()
    db.refresh(c)
    return {"comment_id": c.comment_id, "body": c.body, "created_at": c.created_at}


@router.delete("/comments/{comment_id}")
@limiter.limit("30/minute")
async def delete_comment(request: Request, comment_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """A comment's own author can delete it — previously there was no way
    to remove a comment once posted, by the author or anyone else."""
    c = db.query(Comment).filter(Comment.comment_id == comment_id).first()
    if not c:
        raise HTTPException(404, "Comment not found")
    if c.user_id != current_user.user_id and current_user.role != "admin":
        raise HTTPException(403, "You can only delete your own comments.")
    db.delete(c)
    db.commit()
    return {"deleted": True}


class ReportBody(BaseModel):
    target_type: str   # "submission" | "comment"
    target_id: str
    reason: str


@router.post("/report")
@limiter.limit("20/minute")
async def report_content(request: Request, body: ReportBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Flag a submission or comment for admin review. There was previously
    no moderation surface at all for the social layer — a full user-ban
    admin flow existed, but nothing to act on content itself."""
    if body.target_type not in ("submission", "comment"):
        raise HTTPException(400, "target_type must be 'submission' or 'comment'.")
    if not body.reason.strip():
        raise HTTPException(400, "Please say what's wrong with it.")
    r = Report(reporter_id=current_user.user_id, target_type=body.target_type,
              target_id=body.target_id, reason=body.reason[:500])
    db.add(r)
    db.commit()
    return {"reported": True}


class ShareBody(BaseModel):
    to_user_id: str
    note: str = ""


@router.post("/submissions/{sub_id}/share")
@limiter.limit("30/minute")
async def share_submission(request: Request, sub_id: str, body: ShareBody,
                           current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Share a submission with another writer by sending them a direct message
    that links to it. You can share your own work, or any public submission.
    The recipient must be someone you're connected with (follow or follows
    you), matching the messaging rules."""
    sub = db.query(Submission).filter(Submission.submission_id == sub_id).first()
    if not sub:
        raise HTTPException(404, "Submission not found")
    if not sub.is_public and sub.user_id != current_user.user_id:
        raise HTTPException(403, "You can only share public submissions or your own.")

    peer = db.query(User).filter(User.user_id == body.to_user_id).first()
    if not peer:
        raise HTTPException(404, "That user doesn't exist.")
    if peer.user_id != current_user.user_id:
        connected = db.query(Follow).filter(
            ((Follow.follower_id == current_user.user_id) & (Follow.following_id == peer.user_id)) |
            ((Follow.follower_id == peer.user_id) & (Follow.following_id == current_user.user_id))
        ).first()
        if not connected:
            raise HTTPException(403, "You can only share with people you follow or who follow you.")

    label = sub.topic_title or sub.niche or "a submission"
    note = (body.note or "").strip()[:500]
    content = f"📄 Shared a submission: \"{label}\" → /submission/{sub_id}"
    if note:
        content += f"\n{note}"
    m = Message(message_id=str(uuid.uuid4()), sender_id=current_user.user_id,
                receiver_id=peer.user_id, content=content[:2000])
    db.add(m)
    if peer.user_id != current_user.user_id:
        db.add(Notification(user_id=peer.user_id, type="message",
                            message=f"{current_user.username} shared a submission with you"))
    db.commit()
    return {"shared": True}
