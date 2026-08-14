from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.core.rate_limit import limiter
from app.db.database import engine, SessionLocal
from app.db.models import Base, User, Room, Topic, Badge
from app.core.config import settings
from app.core.security import hash_password
from app.services.badge_service import seed_badges
from app.services import trends_service
from app.api import auth, users, rooms, websocket, feed, social, messages, notifications, analytics, tournaments, admin, payments, coach, solo
import uuid
import asyncio
import logging
from datetime import datetime

# A previous `except Exception: print(...)` pattern throughout the codebase
# meant failures were only ever visible if someone happened to be watching
# the console at that exact moment. Real logging at least timestamps and
# levels everything, and gives every module a named logger.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("writearena.main")

app = FastAPI(title="WriteArena API", version="2.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(rooms.router)
app.include_router(websocket.router)
app.include_router(feed.router)
app.include_router(social.router)
app.include_router(messages.router)
app.include_router(notifications.router)
app.include_router(analytics.router)
app.include_router(tournaments.router)
app.include_router(admin.router)
app.include_router(payments.router)
app.include_router(coach.router)
app.include_router(solo.router)

# ---- Serve the built React frontend (single-container / Hugging Face deploy) ----
# In local dev there is no ./static folder, so this whole block is skipped and the
# Vite dev server serves the UI as before. In the Docker image the built frontend is
# copied to ./static and FastAPI serves it, so the whole app runs from one URL.
import os as _os
from fastapi.responses import FileResponse as _FileResponse
from fastapi.staticfiles import StaticFiles as _StaticFiles

_FRONTEND_DIR = _os.path.join(_os.path.dirname(__file__), "static")
_INDEX_HTML = _os.path.join(_FRONTEND_DIR, "index.html")

if _os.path.isfile(_INDEX_HTML):
    _assets_dir = _os.path.join(_FRONTEND_DIR, "assets")
    if _os.path.isdir(_assets_dir):
        app.mount("/assets", _StaticFiles(directory=_assets_dir), name="assets")

    # Paths that must never be treated as the single-page app.
    _NON_SPA = ("/assets", "/docs", "/redoc", "/openapi.json", "/health", "/ws")

    @app.middleware("http")
    async def _spa_fallback(request: Request, call_next):
        path = request.url.path
        if request.method == "GET" and not path.startswith(_NON_SPA):
            # Serve a real static file if one exists (favicon, manifest, etc.)
            rel = path.lstrip("/")
            candidate = _os.path.normpath(_os.path.join(_FRONTEND_DIR, rel))
            if rel and candidate.startswith(_FRONTEND_DIR) and _os.path.isfile(candidate):
                return _FileResponse(candidate)
            # A browser asking for a page gets the SPA; API calls (JSON) fall through.
            if "text/html" in request.headers.get("accept", ""):
                return _FileResponse(_INDEX_HTML)
        return await call_next(request)

@app.on_event("startup")
def startup():
    print("WriteArena API starting...")
    Base.metadata.create_all(bind=engine)
    _ensure_schema()
    db = SessionLocal()
    try:
        seed_badges(db)
        _seed_admin(db)
        _seed_rooms(db)
        _seed_topics(db)
        print("WriteArena API ready.")
    finally:
        db.close()


def _sync_topics_job():
    """Runs in a worker thread: scrape trending topics for all niches."""
    db = SessionLocal()
    try:
        return trends_service.sync_all(db)
    finally:
        db.close()


async def _topic_refresh_loop():
    # First refresh shortly after boot, then every 3 hours. Non-blocking:
    # the blocking scrape runs in a worker thread so it never stalls the server.
    await asyncio.sleep(5)
    while True:
        try:
            added = await asyncio.to_thread(_sync_topics_job)
            if added:
                print(f"[trends] refreshed trending topics (+{added})")
        except Exception as exc:
            logger.warning("trends refresh loop error: %s", exc, exc_info=True)
        await asyncio.sleep(3 * 60 * 60)


@app.on_event("startup")
async def _start_background_tasks():
    asyncio.create_task(_topic_refresh_loop())

def _ensure_schema():
    """Lightweight, idempotent migration for columns added after the initial
    release. create_all() only creates missing *tables*, not new columns on
    existing ones, so we add those here. Safe to run on every startup."""
    from sqlalchemy import text
    statements = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS description TEXT",
        "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS entry_fee INTEGER DEFAULT 0",
        "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS currency VARCHAR(8) DEFAULT 'PKR'",
        "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prize_pool INTEGER DEFAULT 0",
        "ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS winner_id VARCHAR(36)",
        "ALTER TABLE streak_freezes ADD COLUMN IF NOT EXISTS reason TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(20)",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_sub VARCHAR(255)",
        "ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL",
        "CREATE INDEX IF NOT EXISTS ix_users_oauth_sub ON users (oauth_sub)",
        "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS is_dnf BOOLEAN NOT NULL DEFAULT FALSE",
        "ALTER TABLE analysis_results ADD COLUMN IF NOT EXISTS relevance_score FLOAT",
    ]
    try:
        with engine.begin() as conn:
            for stmt in statements:
                conn.execute(text(stmt))
    except Exception as exc:  # pragma: no cover
        logger.warning("schema migration check skipped: %s", exc, exc_info=True)

def _seed_admin(db):
    if db.query(User).filter(User.email == settings.ADMIN_EMAIL).first():
        return
    admin = User(
        user_id=str(uuid.uuid4()),
        username=settings.ADMIN_USERNAME,
        email=settings.ADMIN_EMAIL,
        password_hash=hash_password(settings.ADMIN_PASSWORD),
        display_name="Admin",
        role="admin",
        status="active",
        is_verified=True,
        created_at=datetime.utcnow(),
    )
    db.add(admin)
    db.commit()
    print(f"Admin created: {settings.ADMIN_EMAIL}")

NICHES = ["technology", "society", "literature", "science", "politics", "business",
          "sports", "health", "entertainment", "arts"]

def _seed_rooms(db):
    for niche in NICHES:
        if not db.query(Room).filter(Room.niche == niche).first():
            db.add(Room(
                room_id=str(uuid.uuid4()),
                name=niche.capitalize() + " Arena",
                niche=niche,
                description=f"Compete in {niche.capitalize()} writing challenges.",
                capacity=10,
                session_duration=300,
                status="idle",
            ))
    db.commit()

TOPICS = {
    "technology": ["How will artificial intelligence reshape employment in the next decade?",
                   "Is social media doing more harm than good to society?",
                   "The ethical implications of facial recognition technology."],
    "society": ["What does community mean in an increasingly digital world?",
                "The role of empathy in resolving modern political conflicts.",
                "Has the concept of privacy become obsolete?"],
    "literature": ["What makes a story timeless?",
                   "The power of unreliable narrators in fiction.",
                   "How does language shape our understanding of the world?"],
    "science": ["Should gene editing in humans be permitted?",
                "What does space exploration mean for humanity future?",
                "The relationship between scientific progress and ethics."],
    "politics": ["Is democracy the best system for the 21st century?",
                 "The balance between national security and civil liberties."],
    "business": ["What responsibilities do corporations have beyond profit?",
                 "The future of remote work and its impact on cities."],
    "sports": ["Does competitive sport build or damage character?",
               "The role of technology in modern athletic performance."],
    "health": ["How should societies prioritise mental health care?",
               "The ethics of medical data collection."],
    "entertainment": ["Does popular culture reflect or shape societal values?",
                      "The impact of streaming on the arts."],
    "arts": ["Can art change the world?", "What is the purpose of art in modern society?"],
}

def _seed_topics(db):
    for niche, titles in TOPICS.items():
        for title in titles:
            if not db.query(Topic).filter(Topic.title == title).first():
                db.add(Topic(topic_id=str(uuid.uuid4()), title=title, niche=niche, approved=True))
    db.commit()

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.0.0"}
