from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Text, ForeignKey, Enum, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    user_id      = Column(String(36), primary_key=True, default=gen_uuid)
    username     = Column(String(50), unique=True, nullable=False, index=True)
    email        = Column(String(255), unique=True, nullable=False, index=True)
    password_hash= Column(String(255), nullable=True)   # null for OAuth-only accounts
    oauth_provider = Column(String(20), nullable=True)  # e.g. "google"; null = password account
    oauth_sub    = Column(String(255), nullable=True, index=True)  # provider's stable user id
    display_name = Column(String(100))
    pen_name     = Column(String(100))
    bio          = Column(Text)
    age          = Column(Integer)
    location     = Column(String(100))
    website      = Column(String(255))
    avatar_url   = Column(String(500))
    cover_url    = Column(String(500))
    role         = Column(Enum("user","admin", name="role_enum"), default="user")
    status       = Column(Enum("active","banned","suspended", name="status_enum"), default="active")
    is_verified  = Column(Boolean, default=False)  # email verified via OTP
    interests    = Column(String(500))
    xp_points    = Column(Integer, default=0)
    level        = Column(Integer, default=1)
    rank         = Column(Enum("bronze","silver","gold","platinum","diamond", name="rank_enum"), default="bronze")
    streak_count = Column(Integer, default=0)
    last_active  = Column(DateTime, default=datetime.utcnow)
    created_at   = Column(DateTime, default=datetime.utcnow)

    submissions  = relationship("Submission", back_populates="user", cascade="all, delete-orphan")
    badges       = relationship("UserBadge", back_populates="user", cascade="all, delete-orphan")
    notifications= relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class Follow(Base):
    __tablename__ = "follows"
    follower_id  = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    following_id = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

class Room(Base):
    __tablename__ = "rooms"
    room_id      = Column(String(36), primary_key=True, default=gen_uuid)
    name         = Column(String(100), nullable=False)
    niche        = Column(String(50), nullable=False)
    description  = Column(Text)
    status       = Column(Enum("waiting","active","idle", name="room_status_enum"), default="idle")
    capacity     = Column(Integer, default=10)
    session_duration = Column(Integer, default=300)
    created_by   = Column(String(36), ForeignKey("users.user_id"))
    created_at   = Column(DateTime, default=datetime.utcnow)

    sessions     = relationship("Session", back_populates="room", cascade="all, delete-orphan")

class RoomMember(Base):
    __tablename__ = "room_members"
    room_id      = Column(String(36), ForeignKey("rooms.room_id", ondelete="CASCADE"), primary_key=True)
    user_id      = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    role         = Column(Enum("participant","spectator", name="member_role_enum"), default="participant")
    joined_at    = Column(DateTime, default=datetime.utcnow)

class Topic(Base):
    __tablename__ = "topics"
    topic_id     = Column(String(36), primary_key=True, default=gen_uuid)
    title        = Column(Text, nullable=False)
    niche        = Column(String(50), nullable=False)
    is_daily     = Column(Boolean, default=False)
    challenge_date = Column(DateTime)
    approved     = Column(Boolean, default=True)
    created_at   = Column(DateTime, default=datetime.utcnow)

class Session(Base):
    __tablename__ = "sessions"
    session_id   = Column(String(36), primary_key=True, default=gen_uuid)
    room_id      = Column(String(36), ForeignKey("rooms.room_id", ondelete="CASCADE"), nullable=False)
    topic_id     = Column(String(36), ForeignKey("topics.topic_id"))
    status       = Column(Enum("waiting","active","ended", name="session_status_enum"), default="waiting")
    started_at   = Column(DateTime)
    ended_at     = Column(DateTime)
    created_at   = Column(DateTime, default=datetime.utcnow)

    room         = relationship("Room", back_populates="sessions")
    submissions  = relationship("Submission", back_populates="session", cascade="all, delete-orphan")

class Submission(Base):
    __tablename__ = "submissions"
    submission_id= Column(String(36), primary_key=True, default=gen_uuid)
    session_id   = Column(String(36), ForeignKey("sessions.session_id", ondelete="CASCADE"))
    user_id      = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    content      = Column(Text, nullable=False)
    word_count   = Column(Integer, default=0)
    is_daily     = Column(Boolean, default=False)
    is_dnf       = Column(Boolean, default=False)   # timer ran out with no real content — not scored
    is_public    = Column(Boolean, default=True)
    niche        = Column(String(50))
    topic_title  = Column(Text)
    submitted_at = Column(DateTime, default=datetime.utcnow)

    user         = relationship("User", back_populates="submissions")
    session      = relationship("Session", back_populates="submissions")
    result       = relationship("AnalysisResult", back_populates="submission", uselist=False, cascade="all, delete-orphan")
    likes        = relationship("Like", back_populates="submission", cascade="all, delete-orphan")
    comments     = relationship("Comment", back_populates="submission", cascade="all, delete-orphan")

class AnalysisResult(Base):
    __tablename__ = "analysis_results"
    result_id        = Column(String(36), primary_key=True, default=gen_uuid)
    submission_id    = Column(String(36), ForeignKey("submissions.submission_id", ondelete="CASCADE"), unique=True)
    plagiarism_score = Column(Float, default=0.0)
    ai_score         = Column(Float, default=0.0)
    quality_score    = Column(Float, default=0.0)
    relevance_score  = Column(Float)   # 0..1 topic relevance; NULL for free-writing
    final_score      = Column(Float, default=0.0)
    grade            = Column(String(5))
    flagged_phrases  = Column(JSON)
    ai_feedback      = Column(Text)
    created_at       = Column(DateTime, default=datetime.utcnow)

    submission       = relationship("Submission", back_populates="result")

class Like(Base):
    __tablename__ = "likes"
    user_id       = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    submission_id = Column(String(36), ForeignKey("submissions.submission_id", ondelete="CASCADE"), primary_key=True)
    created_at    = Column(DateTime, default=datetime.utcnow)

    submission    = relationship("Submission", back_populates="likes")

class Comment(Base):
    __tablename__ = "comments"
    comment_id    = Column(String(36), primary_key=True, default=gen_uuid)
    submission_id = Column(String(36), ForeignKey("submissions.submission_id", ondelete="CASCADE"))
    user_id       = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    body          = Column(Text, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    submission    = relationship("Submission", back_populates="comments")

class Message(Base):
    __tablename__ = "messages"
    message_id   = Column(String(36), primary_key=True, default=gen_uuid)
    sender_id    = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    receiver_id  = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    content      = Column(Text, nullable=False)
    is_read      = Column(Boolean, default=False)
    created_at   = Column(DateTime, default=datetime.utcnow)

class Badge(Base):
    __tablename__ = "badges"
    badge_id     = Column(String(36), primary_key=True, default=gen_uuid)
    name         = Column(String(100), unique=True, nullable=False)
    description  = Column(Text)
    icon         = Column(String(10))
    rarity       = Column(Enum("common","rare","epic","legendary", name="rarity_enum"), default="common")
    condition    = Column(String(50))
    threshold    = Column(Integer, default=1)

class UserBadge(Base):
    __tablename__ = "user_badges"
    user_id      = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True)
    badge_id     = Column(String(36), ForeignKey("badges.badge_id", ondelete="CASCADE"), primary_key=True)
    awarded_at   = Column(DateTime, default=datetime.utcnow)

    user         = relationship("User", back_populates="badges")
    badge        = relationship("Badge")

class Notification(Base):
    __tablename__ = "notifications"
    notification_id = Column(String(36), primary_key=True, default=gen_uuid)
    user_id         = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    type            = Column(String(50))
    message         = Column(Text)
    is_read         = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)

    user            = relationship("User", back_populates="notifications")

class Tournament(Base):
    __tablename__ = "tournaments"
    tournament_id = Column(String(36), primary_key=True, default=gen_uuid)
    name          = Column(String(100), nullable=False)
    type          = Column(Enum("weekly","bracket","daily", name="tournament_type_enum"), default="weekly")
    status        = Column(Enum("upcoming","active","ended", name="tournament_status_enum"), default="upcoming")
    starts_at     = Column(DateTime)
    ends_at       = Column(DateTime)
    bracket_data  = Column(JSON)
    description   = Column(Text)
    entry_fee     = Column(Integer, default=0)     # 0 = free
    currency      = Column(String(8), default="PKR")
    prize_pool    = Column(Integer, default=0)     # accumulates; payout = half
    winner_id     = Column(String(36))
    created_at    = Column(DateTime, default=datetime.utcnow)

class StreakFreeze(Base):
    __tablename__ = "streak_freezes"
    freeze_id    = Column(String(36), primary_key=True, default=gen_uuid)
    user_id      = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    reason       = Column(Text)                     # why the user will be away
    used_at      = Column(DateTime, default=datetime.utcnow)
    expires_at   = Column(DateTime)


class TournamentEntry(Base):
    __tablename__ = "tournament_entries"
    entry_id      = Column(String(36), primary_key=True, default=gen_uuid)
    tournament_id = Column(String(36), ForeignKey("tournaments.tournament_id", ondelete="CASCADE"))
    user_id       = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    paid          = Column(Boolean, default=False)
    best_score    = Column(Float, default=0.0)
    created_at    = Column(DateTime, default=datetime.utcnow)


class Payment(Base):
    __tablename__ = "payments"
    payment_id  = Column(String(36), primary_key=True, default=gen_uuid)
    user_id     = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    purpose     = Column(String(40))    # coach_subscription | certificate | streak_freeze | tournament_entry
    ref_id      = Column(String(36))    # e.g. tournament_id for entry fees
    amount      = Column(Integer)
    currency    = Column(String(8), default="PKR")
    provider    = Column(String(20))    # jazzcash | easypaisa | nayapay
    status      = Column(String(20), default="pending")   # pending | completed | failed
    txn_ref     = Column(String(80))
    note        = Column(Text)          # e.g. streak-freeze reason
    created_at  = Column(DateTime, default=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"
    sub_id     = Column(String(36), primary_key=True, default=gen_uuid)
    user_id    = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    plan       = Column(String(30), default="coach")
    status     = Column(String(20), default="active")     # active | expired
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)


class OtpCode(Base):
    """Verification / password-reset codes. DB-backed (not in-memory) so a
    code survives a server restart and works correctly across more than one
    backend process — an in-memory dict does neither."""
    __tablename__ = "otp_codes"
    key         = Column(String(140), primary_key=True)   # "<purpose>:<email>"
    otp_hash    = Column(String(128), nullable=False)
    expires_at  = Column(DateTime, nullable=False)
    attempts    = Column(Integer, default=0)               # wrong guesses so far


class XpEvent(Base):
    """One row per XP award, so 'this week' / 'this month' leaderboards can
    sum XP actually earned in that window — User.xp_points is only a running
    all-time total, it can't answer 'how much this week' on its own."""
    __tablename__ = "xp_events"
    event_id    = Column(String(36), primary_key=True, default=gen_uuid)
    user_id     = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"), index=True)
    amount      = Column(Integer)
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)


class Report(Base):
    """A user flagging a submission or comment for admin review. There was
    previously no moderation surface at all for the social layer, despite a
    full user-ban admin flow existing for accounts."""
    __tablename__ = "reports"
    report_id       = Column(String(36), primary_key=True, default=gen_uuid)
    reporter_id     = Column(String(36), ForeignKey("users.user_id", ondelete="CASCADE"))
    target_type     = Column(String(20))    # "submission" | "comment"
    target_id       = Column(String(36))
    reason          = Column(Text)
    status          = Column(String(20), default="open")   # open | dismissed | removed
    created_at      = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at     = Column(DateTime)


class FailedJob(Base):
    """A background task (e.g. NLP scoring) that failed on every retry
    attempt. Previously such failures just vanished silently — no record,
    no way to know a submission never got scored except a writer noticing
    their Results page never resolved."""
    __tablename__ = "failed_jobs"
    job_id      = Column(String(36), primary_key=True, default=gen_uuid)
    task_name   = Column(String(100))
    payload     = Column(Text)     # human-readable context, e.g. the submission_id
    error       = Column(Text)
    created_at  = Column(DateTime, default=datetime.utcnow, index=True)