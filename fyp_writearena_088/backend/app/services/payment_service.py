"""Payment layer for WriteArena — JazzCash, EasyPaisa, NayaPay.

Two modes, controlled by PAYMENTS_MODE in .env:

  sandbox (default) — a payment is created and immediately marked completed,
    so the whole flow is demoable without real money or merchant credentials.

  live — real requests are built and sent to each provider using the
    merchant credentials in .env. This actually calls out to the providers'
    APIs; it requires:
      * A real merchant account with that provider (business verification).
      * PUBLIC_BASE_URL set to a real HTTPS domain, since JazzCash/EasyPaisa
        redirect the customer back to pp_ReturnURL after they pay, and then
        POST a server-to-server callback that MUST be verified before the
        purchase is fulfilled (see verify_callback below and the
        /payments/callback/{provider} route in app/api/payments.py).

  JazzCash uses their Mobile Wallet "DoMWalletTransaction" hosted-checkout
  flow: we build the pp_* fields, compute the pp_SecureHash (HMAC-SHA256,
  keyed with the Integrity Salt, over the alphabetically-sorted non-empty
  pp_* values joined with '&'), then redirect the customer to JazzCash's
  hosted page. JazzCash posts back to our callback URL with the same field
  set plus a status; we recompute the hash over their response and compare
  before trusting it.

  EasyPaisa's hosted checkout (easypay) uses a similar hashed-field pattern
  keyed with their Hash Key. NayaPay's checkout API is bearer-token based.

  Field lists and endpoint paths for all three providers change occasionally
  as they update their merchant integration docs — verify against the
  provider's current PDF/API reference before going live with real money.
  This module implements the documented algorithm shape so a team with real
  credentials can wire it up by filling in .env; it has not been exercised
  against a live provider sandbox from this environment.
"""
import base64
import hashlib
import hmac
import json
import uuid
import urllib.request
from datetime import datetime, timedelta

from app.core.config import settings
from app.db.models import Payment

PROVIDERS = {"jazzcash", "easypaisa", "nayapay"}


# --------------------------------------------------------------------------
# Payment record lifecycle (provider-agnostic)
# --------------------------------------------------------------------------

def create_payment(db, user_id: str, purpose: str, amount: int, provider: str,
                   currency: str = "PKR", ref_id: str = None) -> Payment:
    provider = (provider or "jazzcash").lower()
    if provider not in PROVIDERS:
        provider = "jazzcash"
    p = Payment(
        payment_id=str(uuid.uuid4()),
        user_id=user_id,
        purpose=purpose,
        ref_id=ref_id,
        amount=amount,
        currency=currency,
        provider=provider,
        status="pending",
        txn_ref="WA" + uuid.uuid4().hex[:12].upper(),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def _live_ready(provider: str) -> bool:
    if provider == "jazzcash":
        return bool(settings.JAZZCASH_MERCHANT_ID and settings.JAZZCASH_PASSWORD and settings.JAZZCASH_INTEGRITY_SALT)
    if provider == "easypaisa":
        return bool(settings.EASYPAISA_STORE_ID and settings.EASYPAISA_HASH_KEY)
    if provider == "nayapay":
        return bool(settings.NAYAPAY_CLIENT_ID and settings.NAYAPAY_API_KEY)
    return False


def checkout_payload(payment: Payment) -> dict:
    """What the frontend needs to proceed with the payment."""
    if settings.PAYMENTS_MODE != "live":
        return {"mode": "sandbox", "payment_id": payment.payment_id,
                "provider": payment.provider, "amount": payment.amount,
                "currency": payment.currency, "txn_ref": payment.txn_ref,
                "message": "Sandbox mode — press Confirm to simulate a successful payment."}

    if not _live_ready(payment.provider):
        return {"mode": "live", "payment_id": payment.payment_id, "provider": payment.provider,
                "redirect_url": None,
                "message": f"Live mode is on, but {payment.provider} credentials are missing from .env."}

    try:
        if payment.provider == "jazzcash":
            redirect_url, fields = _jazzcash_checkout(payment)
        elif payment.provider == "easypaisa":
            redirect_url, fields = _easypaisa_checkout(payment)
        else:
            redirect_url, fields = _nayapay_checkout(payment)
    except Exception as exc:  # pragma: no cover - network/credentials dependent
        return {"mode": "live", "payment_id": payment.payment_id, "provider": payment.provider,
                "redirect_url": None, "message": f"Could not start checkout: {exc}"}

    return {"mode": "live", "payment_id": payment.payment_id, "provider": payment.provider,
            "redirect_url": redirect_url, "form_fields": fields,
            "message": "Redirecting to the provider's hosted checkout page."}


def verify_payment(db, payment: Payment, provider_ref: str = None) -> bool:
    """Client-initiated 'confirm' check — in sandbox this always succeeds. In
    live mode, real providers don't confirm this way (they redirect + POST a
    server-to-server callback instead — see verify_callback), so this just
    reports whatever the callback has already recorded."""
    if payment.status == "completed":
        return True
    if settings.PAYMENTS_MODE != "live":
        payment.status = "completed"
        if provider_ref:
            payment.txn_ref = provider_ref
        db.commit()
        return True
    return False  # live: only the provider callback can complete a payment


def verify_callback(provider: str, payload: dict) -> tuple:
    """Verify a provider's server-to-server postback. Returns (ok, txn_ref,
    payment_id) — caller (the /payments/callback/{provider} route) looks up
    the Payment by payment_id/txn_ref and marks it completed only if ok."""
    if provider == "jazzcash":
        return _jazzcash_verify_callback(payload)
    if provider == "easypaisa":
        return _easypaisa_verify_callback(payload)
    if provider == "nayapay":
        return _nayapay_verify_callback(payload)
    return False, None, None


def price_in(currency: str, pkr_amount: int) -> int:
    if (currency or "PKR").upper() == "USD":
        return max(1, round(pkr_amount / settings.USD_RATE))
    return pkr_amount


# --------------------------------------------------------------------------
# JazzCash — Mobile Wallet hosted checkout (pp_* fields + HMAC-SHA256 hash)
# --------------------------------------------------------------------------

_JAZZCASH_CHECKOUT_URL = "https://payments.jazzcash.com.pk/ApplicationAPI/API/2.0/Purchase/DoMWalletTransaction"


def _jazzcash_hash(fields: dict, integrity_salt: str) -> str:
    """pp_SecureHash = HMAC-SHA256(salt, salt & <alphabetically-sorted,
    non-empty pp_* values joined with '&'>), hex, uppercase."""
    ordered_values = [str(v) for k, v in sorted(fields.items()) if v not in (None, "")]
    message = integrity_salt + "&" + "&".join(ordered_values)
    digest = hmac.new(integrity_salt.encode(), message.encode(), hashlib.sha256).hexdigest()
    return digest.upper()


def _jazzcash_checkout(payment: Payment):
    now = datetime.utcnow()
    fields = {
        "pp_Version": "1.1",
        "pp_TxnType": "MWALLET",
        "pp_Language": "EN",
        "pp_MerchantID": settings.JAZZCASH_MERCHANT_ID,
        "pp_Password": settings.JAZZCASH_PASSWORD,
        "pp_TxnRefNo": payment.txn_ref,
        "pp_Amount": str(int(payment.amount) * 100),   # JazzCash wants paisas (amount * 100)
        "pp_TxnCurrency": "PKR",
        "pp_TxnDateTime": now.strftime("%Y%m%d%H%M%S"),
        "pp_BillReference": payment.payment_id,
        "pp_Description": f"WriteArena — {payment.purpose}",
        "pp_TxnExpiryDateTime": (now + timedelta(hours=1)).strftime("%Y%m%d%H%M%S"),
        "pp_ReturnURL": settings.PUBLIC_BASE_URL.rstrip("/") + "/payments/callback/jazzcash",
    }
    fields["pp_SecureHash"] = _jazzcash_hash(fields, settings.JAZZCASH_INTEGRITY_SALT)
    # JazzCash's hosted page expects these fields POSTed (not GETted) by the
    # browser — the frontend renders/submits a hidden auto-submit form built
    # from `form_fields` rather than a plain redirect link.
    return _JAZZCASH_CHECKOUT_URL, fields


def _jazzcash_verify_callback(payload: dict):
    salt = settings.JAZZCASH_INTEGRITY_SALT
    received_hash = payload.get("pp_SecureHash", "")
    check_fields = {k: v for k, v in payload.items() if k.startswith("pp_") and k != "pp_SecureHash"}
    expected_hash = _jazzcash_hash(check_fields, salt)
    ok = hmac.compare_digest(received_hash.upper(), expected_hash) and payload.get("pp_ResponseCode") == "000"
    return ok, payload.get("pp_TxnRefNo"), payload.get("pp_BillReference")


# --------------------------------------------------------------------------
# EasyPaisa — hosted checkout (store_id + hashed request)
# --------------------------------------------------------------------------

_EASYPAISA_CHECKOUT_URL = "https://easypay.easypaisa.com.pk/easypay/Index.jsf"


def _easypaisa_hash(fields: dict, hash_key: str) -> str:
    ordered_values = [str(v) for k, v in sorted(fields.items()) if v not in (None, "")]
    message = "&".join(ordered_values)
    digest = hmac.new(hash_key.encode(), message.encode(), hashlib.sha256).digest()
    return base64.b64encode(digest).decode()


def _easypaisa_checkout(payment: Payment):
    now = datetime.utcnow()
    fields = {
        "storeId": settings.EASYPAISA_STORE_ID,
        "amount": str(payment.amount),
        "postBackURL": settings.PUBLIC_BASE_URL.rstrip("/") + "/payments/callback/easypaisa",
        "orderRefNum": payment.txn_ref,
        "expiryDate": (now + timedelta(hours=1)).strftime("%Y%m%d %H%M%S"),
        "autoRedirect": "1",
        "paymentMethod": "MA_PAYMENT_METHOD",
    }
    fields["merchantHashedReq"] = _easypaisa_hash(fields, settings.EASYPAISA_HASH_KEY)
    return _EASYPAISA_CHECKOUT_URL, fields


def _easypaisa_verify_callback(payload: dict):
    expected = _easypaisa_hash(
        {k: v for k, v in payload.items() if k not in ("merchantHashedReq", "signature")},
        settings.EASYPAISA_HASH_KEY)
    ok = hmac.compare_digest(payload.get("signature", ""), expected) and payload.get("status", "").upper() == "PAID"
    return ok, payload.get("transactionId"), payload.get("orderRefNum")


# --------------------------------------------------------------------------
# NayaPay — bearer-token REST checkout
# --------------------------------------------------------------------------

_NAYAPAY_API_BASE = "https://api.nayapay.com/merchant/v1"


def _nayapay_request(path: str, body: dict):
    req = urllib.request.Request(
        _NAYAPAY_API_BASE.rstrip("/") + path,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {settings.NAYAPAY_API_KEY}",
            "X-Client-Id": settings.NAYAPAY_CLIENT_ID,
            "Content-Type": "application/json",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode())


def _nayapay_checkout(payment: Payment):
    body = {
        "amount": payment.amount,
        "currency": "PKR",
        "reference": payment.txn_ref,
        "description": f"WriteArena — {payment.purpose}",
        "callback_url": settings.PUBLIC_BASE_URL.rstrip("/") + "/payments/callback/nayapay",
    }
    out = _nayapay_request("/checkout", body)
    return out.get("checkout_url"), {"reference": payment.txn_ref}


def _nayapay_verify_callback(payload: dict):
    # NayaPay signs callbacks with an HMAC over the raw body using the API
    # key; the route handler passes both the parsed payload and the raw
    # signature header in through payload["_signature"] for this check.
    sig = payload.pop("_signature", "")
    message = json.dumps(payload, separators=(",", ":"), sort_keys=True)
    expected = hmac.new(settings.NAYAPAY_API_KEY.encode(), message.encode(), hashlib.sha256).hexdigest()
    ok = hmac.compare_digest(sig, expected) and payload.get("status") == "completed"
    return ok, payload.get("transaction_id"), payload.get("reference")
