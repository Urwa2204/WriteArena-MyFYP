# WriteArena — Setup Guide

WriteArena is a real-time competitive writing platform: writers join niche rooms,
write against a clock on a shared prompt, and every submission is scored by an NLP
pipeline for originality (plagiarism), authentic voice (AI detection), and quality.

Stack: **React 18 + Vite** frontend · **FastAPI (Python)** backend · **PostgreSQL**.

---

## What's new in this build

1. **3D niche icons** — every room shows a polished, hover-reactive 3D emblem for its
   niche (chip, book, flask, people, scale, bar-chart, trophy, heart, film reel,
   palette). Used on the **Rooms** grid, the **Landing** page, and inside the **Arena**.
   `frontend/src/components/rooms/RoomIcon3D.jsx`.
2. **Scoring breakdown** — the Results page shows the three readings **individually**
   (Plagiarism, AI detection, Quality) *and* a **combined** card with the weighted
   formula and each component's contribution.
3. **Session + challenge timers** — joining/refreshing a room shows the correct
   remaining session time, and the **Daily Challenge** now runs a live countdown
   (auto-submits when it hits zero).
4. **Email OTP verification** — new accounts verify their email with a 6-digit code
   before signing in. Password reset uses the same email pipeline. Real delivery via
   **Resend** (simplest) or **SMTP**; falls back to printing the code to the console
   only if neither is configured.
5. **Google Sign-In** — "Continue with Google" on Login/Register. Skips the OTP step
   entirely (Google has already verified the email) and creates the account on first
   sign-in.
6. **Live payments** — JazzCash/EasyPaisa/NayaPay checkout is now a real integration
   (hosted-page redirect + verified server callback), not just a sandbox stub. Sandbox
   mode is still the default so the demo works with zero setup.
7. **Non-vague, non-copied writing prompts** — live-scraped headlines are rewritten
   into an original prompt (LLM if `COACH_API_KEY`/Ollama is configured, otherwise a
   rule-based paraphrase) instead of being wrapped in quotes verbatim, and headlines
   too short/generic to anchor a good prompt are skipped.

---

## Prerequisites

- **Node.js 18+** and npm
- **Python 3.11+**
- **PostgreSQL 14+**

---

## 1. Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
source .venv/bin/activate

pip install -r requirements.txt
python -m spacy download en_core_web_sm      # quality-analysis model

# configure environment
cp .env.example .env         # then edit .env (DATABASE_URL, SMTP, etc.)

# make sure PostgreSQL is running and the database exists:
#   createdb writearena        (or point DATABASE_URL at your own DB)

uvicorn main:app --reload --port 8000
```

Tables are created automatically on startup. New columns added by this build (e.g.
`users.is_verified`) are applied idempotently on startup too — **no manual migration
step**, and it's safe to run against an existing database.

- API: http://localhost:8000  ·  interactive docs: http://localhost:8000/docs

## 2. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

The frontend expects the API at `http://localhost:8000` (see `frontend/src/services/api.js`
to change it).

---

## Email setup (OTP verification)

Verification and password-reset codes are delivered for real via **Resend** or
**SMTP** (tried in that order), configured in `backend/.env`. If neither is set,
codes are printed to the backend console instead — dev-only, no email actually sent.

**Option 1 — Resend (recommended, easiest):**

1. Sign up at https://resend.com (free tier is enough for OTP volume) and grab an API key.
2. Set:
   ```
   RESEND_API_KEY=re_your_key_here
   EMAIL_FROM=WriteArena <no-reply@yourdomain.com>
   ```
   Resend requires the `EMAIL_FROM` domain to be verified in their dashboard, or you
   can use their shared `onboarding@resend.dev` sender for testing.

**Option 2 — SMTP:**

| Variable | Meaning |
|---|---|
| `SMTP_HOST` | SMTP server (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | `587` for STARTTLS, `465` for SSL |
| `SMTP_USER` | SMTP username / sending address |
| `SMTP_PASSWORD` | SMTP password or app password |
| `SMTP_USE_TLS` | `True` = STARTTLS (587), `False` = SSL (465) |
| `EMAIL_FROM` | From header, e.g. `WriteArena <no-reply@writearena.com>` |
| `OTP_TTL_SECONDS` | Code lifetime (default 600 = 10 min) |

**Gmail example:** enable 2-Step Verification, create an *App Password*, then:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USE_TLS=True
SMTP_USER=you@gmail.com
SMTP_PASSWORD=your16charapppassword
EMAIL_FROM=WriteArena <you@gmail.com>
```

(SendGrid, Mailgun, Brevo, Amazon SES etc. work the same way.)

**Development (no email account needed):** leave `RESEND_API_KEY` and `SMTP_HOST`
blank. Codes are printed to the backend console instead, e.g.:

```
[DEV] verify OTP for jane@example.com: 481920
```

---

## Google Sign-In setup

1. In [Google Cloud Console](https://console.cloud.google.com) → **APIs & Services →
   Credentials** → **Create Credentials → OAuth client ID** → type **Web application**.
2. Under **Authorized JavaScript origins**, add your frontend URL(s), e.g.
   `http://localhost:3000` for local dev.
3. Copy the generated **Client ID** into *both* of these (they must match exactly):
   ```
   backend/.env:   GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   frontend/.env:  VITE_GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
   ```
4. Restart both servers. A "Continue with Google" button appears on Login and step 1
   of Register automatically once `VITE_GOOGLE_CLIENT_ID` is set — leave it blank to
   keep the button hidden.

Signing in with Google creates the account pre-verified (Google already confirmed the
email) and skips the OTP step entirely. If an account with that email already exists
(e.g. originally registered with a password), Google sign-in links to it instead of
creating a duplicate.

### How verification works

1. **Register** → account created as *unverified*, a 6-digit code is emailed, and the
   app opens `/verify-email`.
2. **Verify** → enter the code → account activated, signed in, sent to the dashboard.
   A **Resend code** option is available (30-second cooldown).
3. **Login** → unverified accounts are bounced to `/verify-email` automatically.

New endpoints: `POST /auth/verify-email`, `POST /auth/resend-verification`
(registration returns `{ verification_required, email }` instead of tokens).

---

## Default admin

From `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), seeded and pre-verified on first run:

```
email:    admin@writearena.com
password: Admin1234!
```

Change these before any real deployment.

---

## Running the backend test suite

```bash
cd backend
pip install -r requirements.txt
pip install -r requirements-dev.txt

# The suite runs against a real Postgres database (not SQLite — see the
# single-process architecture note above for why parity with production
# matters here), pointed at by TEST_DATABASE_URL so it never touches your
# real dev data:
createdb writearena_test        # once, if it doesn't already exist
export TEST_DATABASE_URL=postgresql://postgres:<your_pg_password>@localhost:5432/writearena_test

python -m pytest tests/ -v
```

Covers: registration/verification/login, the OTP attempt-lockout, the
sandbox payment flow, solo/room scoring (including the DNF path), room-
membership authorization, and the moderation report/remove flow. It does
**not** require spaCy's model or `transformers` to be installed — both have
documented fallback paths (see `app/nlp/quality.py` and `app/nlp/ai_detector.py`)
that the tests exercise the same way a machine without those installed
would in production.

CI (`.github/workflows/ci.yml`) runs this same suite against a real
Postgres service container on every push, plus a frontend production build
check.

---

## Troubleshooting

- **"Email not verified" on login** → grab the code from the backend console (dev) or
  your inbox, or use **Resend code** on the verify screen.
- **No code arrives with SMTP set** → check backend logs for `[EMAIL] Failed to send…`;
  verify host/port/credentials and that `SMTP_USE_TLS` matches the port (587↔True, 465↔False).
- **3D icons don't render** → ensure `npm install` pulled `three`, `@react-three/fiber`,
  and `@react-three/drei` (already in `frontend/package.json`).
- **Quality scores are zero** → run `python -m spacy download en_core_web_sm`.
- **`column users.is_verified does not exist`** → shouldn't happen (auto-migrated on
  startup), but if it does, run once:
  `ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;` then
  `UPDATE users SET is_verified = TRUE;`

---

## Monetization & AI suite (new)

**Payments (JazzCash / EasyPaisa / NayaPay).** Out of the box `PAYMENTS_MODE=sandbox`,
so every paid action (AI coach, certificate, streak-freeze, tournament entry) runs the
full checkout and completes without real money — perfect for the demo.

To take real PKR: open a **merchant account** with the provider(s) you want (business
verification + secret keys — this part is external to this codebase), set
`PUBLIC_BASE_URL` to your real HTTPS domain, set `PAYMENTS_MODE=live`, and fill in
whichever of `JAZZCASH_* / EASYPAISA_* / NAYAPAY_*` you have credentials for — the
integration itself is implemented (not a stub): JazzCash and EasyPaisa redirect the
customer to the provider's hosted checkout page (`payment_service.py` builds the
signed `pp_*`/`merchantHashedReq` fields per each provider's documented algorithm),
and the provider POSTs back to `/payments/callback/{provider}`, which verifies the
signature/hash before marking the payment complete — the browser's own "Confirm"
click can no longer complete a live payment by itself, only a verified provider
callback can. NayaPay uses a bearer-token REST checkout instead of a redirect form.

This has been implemented against each provider's published integration
documentation but **not exercised against a live provider sandbox** from this
environment — verify the field list and endpoint against the provider's current
merchant integration guide before processing real transactions, and test in each
provider's own sandbox before going live. Prices (PKR): coach 500/mo, certificate
100, streak-freeze 300, tournament entry 150; USD is shown at `USD_RATE`.

**AI writing coach.** Gives one improvement per piece; it's a paid subscription (₨500/mo).
- *Online:* set `COACH_API_KEY` (any OpenAI-compatible endpoint via `COACH_API_BASE`).
- *Offline:* install **Ollama** (https://ollama.com), run `ollama pull llama3.2`, keep
  `OLLAMA_HOST=http://localhost:11434`. This is what powers the coach when the site runs
  offline.
- If neither is set it falls back to a built-in heuristic, so it never hard-fails.

**Solo writing (offline).** New "Solo Writing" item in the sidebar / `/solo` — write at
your own pace, non-competitive, scored locally, still earns XP/streaks/badges. Works
offline; the coach uses Ollama there.

**Certificate.** Unlocks at a score of `CERT_MIN_SCORE` (95) while on a
`CERT_MIN_STREAK` (7) day streak; costs ₨100; downloads as a PDF on the WriteArena scroll
with the writer's name, pen name, score and date. Needs `reportlab` (already in
requirements).

**Admin tournaments.** Admin dashboard → *Announce a tournament* (name, type, entry fee,
dates). Users pay the entry fee to join; the prize pool grows with each entry and the
**winner takes half** when the admin clicks *Close & pick winner*.

**Train your own detector.** `ml/WriteArena_AI_Detector_Training.ipynb` fine-tunes a
RoBERTa human-vs-AI classifier in Google Colab and pushes it to the Hugging Face Hub.
Set `HF_MODEL` to your pushed repo to use it in the app.
