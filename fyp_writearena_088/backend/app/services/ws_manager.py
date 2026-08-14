from fastapi import WebSocket
from typing import Dict, List, Set
import json, asyncio

class ConnectionManager:
    def __init__(self):
        self.rooms: Dict[str, List[WebSocket]] = {}
        self.user_sockets: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, room_id: str, user_id: str):
        await websocket.accept()
        if room_id not in self.rooms:
            self.rooms[room_id] = []
        self.rooms[room_id].append(websocket)
        self.user_sockets[user_id] = websocket

    def disconnect(self, websocket: WebSocket, room_id: str, user_id: str):
        if room_id in self.rooms:
            try:
                self.rooms[room_id].remove(websocket)
            except ValueError:
                pass
        self.user_sockets.pop(user_id, None)

    async def broadcast_room(self, room_id: str, message: dict, exclude: WebSocket = None):
        if room_id not in self.rooms:
            return
        dead = []
        seen = set()
        for ws in self.rooms[room_id]:
            if ws == exclude or id(ws) in seen:
                continue
            seen.add(id(ws))
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            try:
                self.rooms[room_id].remove(ws)
            except ValueError:
                pass

    async def send_personal(self, user_id: str, message: dict):
        ws = self.user_sockets.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.user_sockets.pop(user_id, None)

manager = ConnectionManager()
