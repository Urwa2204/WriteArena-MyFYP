from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db, SessionLocal
from app.db.models import Room, RoomMember, User, Session as GameSession, Topic, AnalysisResult, Submission, Report
from app.core.security import decode_token
from app.services.ws_manager import manager
from app.services import trends_service
from app.nlp.moderation import mask_abuse, contains_abuse
from datetime import datetime
import asyncio, uuid, json, logging

logger = logging.getLogger("writearena.websocket")

router = APIRouter(tags=["websocket"])

@router.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()
    user_id = None
    db = SessionLocal()
    try:
        # Auth handshake — 5 second timeout
        try:
            auth_data = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
            token = auth_data.get("token", "")
            payload = decode_token(token)
            user_id = payload.get("sub")
            user = db.query(User).filter(User.user_id == user_id).first()
            if not user:
                await websocket.close(code=4001)
                return
        except asyncio.TimeoutError:
            await websocket.close(code=4001)
            return
        except Exception:
            await websocket.close(code=4001)
            return

        room_sockets = manager.rooms.setdefault(room_id, [])
        # Guard against the same socket being appended twice, and drop any
        # stale earlier socket still lingering for this user in this room
        # (e.g. a reconnect that raced the old connection's cleanup). Without
        # this, a broadcast reached the user's browser more than once and
        # every lobby chat line showed up doubled.
        prev = manager.user_sockets.get(user_id)
        if prev is not None and prev in room_sockets and prev is not websocket:
            try:
                room_sockets.remove(prev)
            except ValueError:
                pass
        if websocket not in room_sockets:
            room_sockets.append(websocket)
        manager.user_sockets[user_id] = websocket

        await websocket.send_json({"type": "connected", "user_id": user_id})
        await manager.broadcast_room(room_id, {
            "type": "user_joined",
            "user_id": user_id,
            "username": user.username,
            "avatar_url": user.avatar_url,
        }, exclude=websocket)

        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=60.0)
                msg_type = data.get("type", "")

                if msg_type == "chat":
                    raw = str(data.get("message", ""))[:500]
                    # Filter abusive language: mask it in the delivered message
                    # and log a report to the moderation queue so an admin sees
                    # it, without dropping the whole message.
                    clean = mask_abuse(raw)
                    if contains_abuse(raw):
                        try:
                            db.add(Report(reporter_id=user_id, target_type="chat",
                                          target_id=room_id,
                                          reason=f"Auto-flagged abusive language in lobby chat: \"{raw[:200]}\""))
                            db.commit()
                        except Exception:
                            db.rollback()
                    await manager.broadcast_room(room_id, {
                        "type": "chat",
                        "msg_id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "username": user.username,
                        "avatar_url": user.avatar_url,
                        "message": clean,
                    })

                elif msg_type == "typing":
                    await manager.broadcast_room(room_id, {
                        "type": "typing",
                        "user_id": user_id,
                        "word_count": int(data.get("word_count", 0)),
                    }, exclude=websocket)

                elif msg_type == "start_session":
                    # Must be a genuine participant of this room to start a
                    # session for everyone else — spectators (role="spectator")
                    # can watch but not control the room.
                    member = db.query(RoomMember).filter(
                        RoomMember.room_id == room_id, RoomMember.user_id == user_id,
                        RoomMember.role == "participant",
                    ).first()
                    already_active = db.query(GameSession).filter(
                        GameSession.room_id == room_id, GameSession.status == "active"
                    ).first()
                    if not member:
                        await websocket.send_json({
                            "type": "error", "message": "Join as a participant (not a spectator) to start a session.",
                        })
                        continue
                    if already_active:
                        await websocket.send_json({
                            "type": "error", "message": "A session is already running in this room.",
                        })
                        continue
                    room = db.query(Room).filter(Room.room_id == room_id).first()
                    # Scrape live trending headlines for this niche (off the event
                    # loop so it never blocks other connections), then pick one.
                    prompts = []
                    try:
                        prompts = await asyncio.to_thread(
                            trends_service.get_trending_prompts, room.niche, 8)
                    except Exception as exc:
                        logger.warning("trends scrape failed for room %s niche %r: %s", room_id, room.niche, exc, exc_info=True)
                    topic = trends_service.upsert_and_pick(db, room.niche, prompts)
                    session = GameSession(
                        session_id=str(uuid.uuid4()),
                        room_id=room_id,
                        topic_id=topic.topic_id if topic else None,
                        status="active",
                        started_at=datetime.utcnow(),
                    )
                    room.status = "active"
                    db.add(session)
                    db.commit()
                    await manager.broadcast_room(room_id, {
                        "type": "session_start",
                        "session_id": session.session_id,
                        "topic": topic.title if topic else "Write about anything you choose.",
                        "duration": room.session_duration,
                    })

                elif msg_type == "end_session":
                    # Previously anyone connected to the socket — even someone who
                    # never joined the room — could end a live session for every
                    # writer in it. Require genuine participant membership before
                    # honoring this (any participant, not just whoever started it,
                    # can end early — matches how the room's "everyone opts in"
                    # design already works for starting).
                    member = db.query(RoomMember).filter(
                        RoomMember.room_id == room_id, RoomMember.user_id == user_id,
                        RoomMember.role == "participant",
                    ).first()
                    if not member:
                        await websocket.send_json({
                            "type": "error", "message": "Only room participants can end a session.",
                        })
                        continue
                    session = db.query(GameSession).filter(
                        GameSession.room_id == room_id, GameSession.status == "active"
                    ).first()
                    if session:
                        session.status = "ended"
                        session.ended_at = datetime.utcnow()
                        room = db.query(Room).filter(Room.room_id == room_id).first()
                        if room: room.status = "idle"
                        db.commit()
                        subs = db.query(Submission).filter(Submission.session_id == session.session_id).all()
                        leaderboard = []
                        for s in subs:
                            res = db.query(AnalysisResult).filter(AnalysisResult.submission_id == s.submission_id).first()
                            u2 = db.query(User).filter(User.user_id == s.user_id).first()
                            leaderboard.append({
                                "user_id": s.user_id,
                                "username": u2.username if u2 else "",
                                "avatar_url": u2.avatar_url if u2 else None,
                                "final_score": res.final_score if res else None,
                                "grade": res.grade if res else None,
                                "is_dnf": s.is_dnf,
                            })
                        # DNF entries always sort last, below every scored
                        # entry — previously they'd blend in among genuine
                        # score=0 results since both sorted as 0.
                        leaderboard.sort(key=lambda x: (x["is_dnf"], -(x["final_score"] or 0)))
                        await manager.broadcast_room(room_id, {
                            "type": "session_end",
                            "leaderboard": leaderboard,
                        })

                elif msg_type == "ping":
                    await websocket.send_json({"type": "pong"})

            except asyncio.TimeoutError:
                try:
                    await websocket.send_json({"type": "ping"})
                except Exception:
                    break

    except WebSocketDisconnect:
        pass
    finally:
        if user_id:
            manager.disconnect(websocket, room_id, user_id)
            await manager.broadcast_room(room_id, {
                "type": "user_left", "user_id": user_id
            })
        db.close()
