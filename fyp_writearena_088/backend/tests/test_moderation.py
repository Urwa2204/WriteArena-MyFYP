from app.core.config import settings


def _admin_headers(client):
    r = client.post("/auth/login", json={"email": settings.ADMIN_EMAIL, "password": settings.ADMIN_PASSWORD})
    assert r.status_code == 200, "Seeded admin login failed — check ADMIN_EMAIL/ADMIN_PASSWORD in the test environment"
    return {"Authorization": "Bearer " + r.json()["access_token"]}


def test_report_appears_in_admin_queue_and_can_be_removed(client, register_and_verify):
    headers, user = register_and_verify()
    r = client.post("/solo/submit", json={
        "content": "Enough words here to count as a real submission for the moderation test suite."
    }, headers=headers)
    sub_id = r.json()["submission_id"]

    r = client.post(f"/social/submissions/{sub_id}/comments", json={"body": "flag this comment please"}, headers=headers)
    comment_id = r.json()["comment_id"]

    r = client.post("/social/report", json={
        "target_type": "comment", "target_id": comment_id, "reason": "automated test report"
    }, headers=headers)
    assert r.status_code == 200

    admin = _admin_headers(client)
    r = client.get("/admin/reports", params={"status": "open"}, headers=admin)
    matches = [rep for rep in r.json() if rep["target_id"] == comment_id]
    assert matches, "the report never showed up in the open moderation queue"
    report_id = matches[0]["report_id"]
    assert matches[0]["target_still_exists"] is True

    r = client.post(f"/admin/reports/{report_id}/remove", headers=admin)
    assert r.status_code == 200
    assert r.json()["content_deleted"] is True

    r = client.get("/admin/reports", params={"status": "removed"}, headers=admin)
    removed = [rep for rep in r.json() if rep["report_id"] == report_id]
    assert removed and removed[0]["target_still_exists"] is False


def test_non_admin_cannot_reach_moderation_queue(client, register_and_verify):
    headers, user = register_and_verify()
    r = client.get("/admin/reports", headers=headers)
    assert r.status_code == 403
