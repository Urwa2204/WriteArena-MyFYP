import time


def _wait_for_score(client, headers, submission_id, timeout=15):
    deadline = time.time() + timeout
    last = None
    while time.time() < deadline:
        r = client.get("/feed/submission/" + submission_id, headers=headers)
        last = r.json()
        if last.get("final_score") is not None:
            return last
        time.sleep(0.5)
    return last


def test_solo_submission_gets_scored(client, register_and_verify):
    headers, user = register_and_verify()
    r = client.post("/solo/submit", json={
        "content": "A reasonably long solo writing sample used to test that the scoring "
                   "pipeline actually runs end to end through the bounded task queue."
    }, headers=headers)
    assert r.status_code == 200
    sub_id = r.json()["submission_id"]

    result = _wait_for_score(client, headers, sub_id)
    assert result["final_score"] is not None
    assert 0 <= result["final_score"] <= 100
    assert result["is_dnf"] is False


def test_too_short_solo_submission_is_rejected(client, register_and_verify):
    headers, user = register_and_verify()
    r = client.post("/solo/submit", json={"content": "too short"}, headers=headers)
    assert r.status_code == 400


def test_dnf_room_submission_is_not_scored(client, register_and_verify):
    """Regression test: a DNF submission should never get a fake score —
    previously the literal string 'No submission' was scored as real content."""
    headers, user = register_and_verify()
    rooms = client.get("/rooms", headers=headers).json()
    room_id = rooms[0]["room_id"]
    client.post(f"/rooms/{room_id}/join", headers=headers)

    r = client.post(f"/rooms/{room_id}/submit",
                    json={"content": "too short", "draft": False, "dnf": True},
                    headers=headers)
    assert r.status_code == 200
    assert r.json()["is_dnf"] is True
    sub_id = r.json()["submission_id"]

    r = client.get("/feed/submission/" + sub_id, headers=headers)
    assert r.json()["is_dnf"] is True
    assert r.json()["final_score"] is None
    assert r.json()["word_count"] == 0
