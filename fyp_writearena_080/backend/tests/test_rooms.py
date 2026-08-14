def test_submit_without_joining_is_rejected(client, register_and_verify):
    """Regression test for the authz fix: submitting into a room you never
    joined should be rejected, not silently accepted."""
    headers, user = register_and_verify()
    rooms = client.get("/rooms", headers=headers).json()
    room_id = rooms[0]["room_id"]
    r = client.post(f"/rooms/{room_id}/submit",
                    json={"content": "trying to submit without ever joining this room first"},
                    headers=headers)
    assert r.status_code == 403


def test_submit_after_joining_is_accepted(client, register_and_verify):
    headers, user = register_and_verify()
    rooms = client.get("/rooms", headers=headers).json()
    room_id = rooms[0]["room_id"]
    r = client.post(f"/rooms/{room_id}/join", headers=headers)
    assert r.status_code == 200
    r = client.post(f"/rooms/{room_id}/submit",
                    json={"content": "a real entry submitted after properly joining the room first"},
                    headers=headers)
    assert r.status_code == 200


def test_leaderboard_accepts_all_scope_values(client, register_and_verify):
    headers, user = register_and_verify()
    for scope in ("all", "week", "month"):
        r = client.get("/users/leaderboard", params={"scope": scope, "limit": 10}, headers=headers)
        assert r.status_code == 200
        assert isinstance(r.json(), list)


def test_dm_requires_a_follow_relationship(client, register_and_verify):
    """Regression test: sending a DM to someone you don't follow (and who
    doesn't follow you) should be rejected server-side, not just hidden by
    the frontend UI."""
    headers_a, user_a = register_and_verify()
    headers_b, user_b = register_and_verify()
    r = client.post(f"/messages/{user_b['user_id']}", json={"content": "hi stranger"}, headers=headers_a)
    assert r.status_code == 403
