def test_sandbox_coach_subscription_completes(client, register_and_verify):
    headers, user = register_and_verify()

    r = client.get("/coach/status", headers=headers)
    assert r.json()["subscribed"] is False

    r = client.post("/payments/initiate",
                    json={"purpose": "coach_subscription", "provider": "jazzcash", "currency": "PKR"},
                    headers=headers)
    assert r.status_code == 200
    assert r.json()["checkout"]["mode"] == "sandbox"
    payment_id = r.json()["payment"]["payment_id"]

    r = client.post(f"/payments/{payment_id}/confirm", headers=headers)
    assert r.status_code == 200
    assert r.json()["status"] == "completed"

    r = client.get("/coach/status", headers=headers)
    assert r.json()["subscribed"] is True


def test_confirming_an_already_completed_payment_is_idempotent(client, register_and_verify):
    headers, user = register_and_verify()
    r = client.post("/payments/initiate",
                    json={"purpose": "streak_freeze", "provider": "jazzcash", "currency": "PKR"},
                    headers=headers)
    payment_id = r.json()["payment"]["payment_id"]

    r1 = client.post(f"/payments/{payment_id}/confirm", headers=headers)
    r2 = client.post(f"/payments/{payment_id}/confirm", headers=headers)
    assert r1.status_code == 200 and r2.status_code == 200
    assert r1.json()["status"] == "completed"
    assert r2.json()["status"] == "completed"


def test_unknown_purchase_purpose_is_rejected(client, register_and_verify):
    headers, user = register_and_verify()
    r = client.post("/payments/initiate",
                    json={"purpose": "not_a_real_thing", "provider": "jazzcash", "currency": "PKR"},
                    headers=headers)
    assert r.status_code == 400
