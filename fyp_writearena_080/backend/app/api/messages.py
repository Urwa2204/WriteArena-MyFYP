from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.database import get_db
from app.db.models import Message, User, Follow
from app.core.dependencies import get_current_user
from app.core.rate_limit import limiter
import uuid

router = APIRouter(prefix="/messages", tags=["messages"])

class MsgBody(BaseModel):
    content: str

@router.get("/conversations")
def conversations(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sent = db.query(Message.receiver_id).filter(Message.sender_id == current_user.user_id).distinct()
    received = db.query(Message.sender_id).filter(Message.receiver_id == current_user.user_id).distinct()
    peer_ids = set([r[0] for r in sent] + [r[0] for r in received])
    peers = []
    for pid in peer_ids:
        u = db.query(User).filter(User.user_id == pid).first()
        if u:
            last = db.query(Message).filter(
                ((Message.sender_id == current_user.user_id) & (Message.receiver_id == pid)) |
                ((Message.sender_id == pid) & (Message.receiver_id == current_user.user_id))
            ).order_by(Message.created_at.desc()).first()
            unread = db.query(Message).filter(Message.sender_id == pid, Message.receiver_id == current_user.user_id, Message.is_read == False).count()
            peers.append({"user": {"user_id": u.user_id, "username": u.username, "avatar_url": u.avatar_url},
                         "last_message": last.content[:100] if last else None,
                         "last_at": last.created_at if last else None, "unread": unread})
    return sorted(peers, key=lambda x: x["last_at"] or "", reverse=True)

@router.get("/contacts")
def contacts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """People you can start a conversation with: everyone you follow or who follows you."""
    from app.db.models import Follow
    following = [f.following_id for f in db.query(Follow).filter(Follow.follower_id == current_user.user_id).all()]
    followers = [f.follower_id for f in db.query(Follow).filter(Follow.following_id == current_user.user_id).all()]
    ids = set(following) | set(followers)
    out = []
    for uid in ids:
        u = db.query(User).filter(User.user_id == uid).first()
        if u:
            out.append({"user_id": u.user_id, "username": u.username, "avatar_url": u.avatar_url,
                        "you_follow": uid in following, "follows_you": uid in followers})
    out.sort(key=lambda x: x["username"].lower())
    return out

@router.get("/{peer_id}")
def get_messages(peer_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msgs = db.query(Message).filter(
        ((Message.sender_id == current_user.user_id) & (Message.receiver_id == peer_id)) |
        ((Message.sender_id == peer_id) & (Message.receiver_id == current_user.user_id))
    ).order_by(Message.created_at).limit(100).all()
    for m in msgs:
        if m.receiver_id == current_user.user_id and not m.is_read:
            m.is_read = True
    db.commit()
    return [{"message_id": m.message_id, "sender_id": m.sender_id, "content": m.content,
             "created_at": m.created_at, "is_read": m.is_read} for m in msgs]

@router.post("/{peer_id}")
@limiter.limit("30/minute")
async def send_message(request: Request, peer_id: str, body: MsgBody, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # The frontend only offers "New message" for people you follow or who
    # follow you — enforce that server-side too, or anyone could DM anyone
    # by user_id regardless of the UI's own rule.
    if peer_id != current_user.user_id:
        connected = db.query(Follow).filter(
            ((Follow.follower_id == current_user.user_id) & (Follow.following_id == peer_id)) |
            ((Follow.follower_id == peer_id) & (Follow.following_id == current_user.user_id))
        ).first()
        if not connected:
            raise HTTPException(403, "You can only message people you follow or who follow you.")
    m = Message(message_id=str(uuid.uuid4()), sender_id=current_user.user_id,
                receiver_id=peer_id, content=body.content[:2000])
    db.add(m)
    db.commit()
    db.refresh(m)
    return {"message_id": m.message_id, "created_at": m.created_at}
