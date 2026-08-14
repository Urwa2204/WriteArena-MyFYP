"""Shared fixtures for the WriteArena backend test suite.

Runs against a real Postgres database (matching production — see
SETUP.md's single-process-architecture note for why this isn't SQLite),
pointed at by TEST_DATABASE_URL so it never touches real dev/prod data.
Defaults to a local `writearena_test` database if TEST_DATABASE_URL isn't
set. See .github/workflows/ci.yml for how this is provisioned in CI.
"""
import os

# Must happen before importing anything from the app — config.py reads
# these once at import time via pydantic-settings.
os.environ.setdefault(
    "DATABASE_URL",
    os.environ.get("TEST_DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/writearena_test"),
)
os.environ.setdefault("PAYMENTS_MODE", "sandbox")
# "development" is the specific value that unlocks the console-printed OTP
# codes (see otp_service.py) — tests need that to read the code back out,
# the same way a developer would when testing the flow by hand.
os.environ.setdefault("ENV", "development")

import contextlib
import io
import re
import uuid as _uuid

import pytest
from fastapi.testclient import TestClient

from main import app
from app.core.rate_limit import limiter


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_rate_limits():
    # Every test in this suite goes through the same TestClient, which
    # means every request shares one "IP" as far as slowapi's default
    # key_func is concerned — without this, a full test run trips the same
    # per-IP limits a flood of requests from one real user would, and later
    # tests fail for a reason that has nothing to do with what they're
    # actually testing.
    limiter.reset()
    yield


@pytest.fixture()
def register_and_verify(client):
    """Returns a helper: call it to register + verify a fresh user, get
    back (auth_headers, user_dict). Each call makes a genuinely new user
    (random username/email) so tests don't collide with each other."""
    def _do(username=None, email=None):
        username = username or ("u" + _uuid.uuid4().hex[:10])
        email = email or (username + "@example.com")
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            client.post("/auth/register", json={
                "username": username, "email": email,
                "password": "Password123!", "display_name": username,
            })
        m = re.search(r"verify OTP for " + re.escape(email) + r": (\d+)", buf.getvalue())
        assert m, f"OTP not found in registration output for {email}"
        r = client.post("/auth/verify-email", json={"email": email, "otp": m.group(1)})
        assert r.status_code == 200, r.text
        token = r.json()["access_token"]
        user = r.json()["user"]
        return {"Authorization": "Bearer " + token}, user
    return _do
