def test_register_and_verify_succeeds(register_and_verify):
    headers, user = register_and_verify()
    assert user["is_verified"] is True
    assert "@" in user["email"]


def test_duplicate_username_is_rejected(client, register_and_verify):
    _, user = register_and_verify()
    r = client.post("/auth/register", json={
        "username": user["username"], "email": "a-different-address@example.com",
        "password": "Password123!", "display_name": "dupe",
    })
    assert r.status_code == 400


def test_login_with_wrong_password_is_rejected(client, register_and_verify):
    _, user = register_and_verify()
    r = client.post("/auth/login", json={"email": user["email"], "password": "TotallyWrongPassword!"})
    assert r.status_code == 401


def test_login_with_correct_password_succeeds(client, register_and_verify):
    _, user = register_and_verify()
    r = client.post("/auth/login", json={"email": user["email"], "password": "Password123!"})
    assert r.status_code == 200
    assert r.json()["access_token"]


def test_otp_locks_out_after_five_wrong_attempts(client):
    """Regression test for the OTP hardening fix: a code should stop
    working after MAX_ATTEMPTS wrong guesses, even before it expires."""
    import contextlib
    import io
    import re
    import uuid

    email = f"lockout_{uuid.uuid4().hex[:8]}@example.com"
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        client.post("/auth/register", json={
            "username": email.split("@")[0], "email": email,
            "password": "Password123!", "display_name": "lockout-test",
        })
    real_otp = re.search(r"verify OTP for " + re.escape(email) + r": (\d+)", buf.getvalue()).group(1)

    for _ in range(5):
        r = client.post("/auth/verify-email", json={"email": email, "otp": "000000"})
        assert r.status_code == 400

    # The 6th attempt — even with the CORRECT code — should now fail,
    # because the lockout deletes the code outright rather than letting
    # the window keep ticking.
    r = client.post("/auth/verify-email", json={"email": email, "otp": real_otp})
    assert r.status_code == 400
