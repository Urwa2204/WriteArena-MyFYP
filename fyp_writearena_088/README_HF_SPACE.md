---
title: WriteArena
emoji: 🖋️
colorFrom: purple
colorTo: pink
sdk: docker
app_port: 7860
pinned: false
---

# WriteArena

Competitive & solo writing platform — React frontend + FastAPI backend + live
WebSocket lobbies, with offline NLP scoring (plagiarism, AI-detection,
quality, topic relevance).

This Space runs the **whole app in one container**: FastAPI serves the built
React frontend, the REST API and the `/ws` WebSocket lobby all from the same
origin on port 7860. The AI-detector transformer, spaCy pipeline and nltk word
list are baked into the image at build time, so cold starts don't re-download
them.

## Required Space secrets (Settings → Variables and secrets)

| Name | Example / note |
|------|----------------|
| `DATABASE_URL` | Neon pooled connection string, e.g. `postgresql://user:pass@ep-xxx-pooler.REGION.aws.neon.tech/writearena?sslmode=require` |
| `SECRET_KEY` | any random 32+ char string |
| `ADMIN_EMAIL` | your admin login email |
| `ADMIN_PASSWORD` | your admin login password |
| `PUBLIC_BASE_URL` | `https://<user>-<space>.hf.space` |
| `CORS_ORIGINS` | `https://<user>-<space>.hf.space` (same-origin, but set it anyway) |

Optional: `RESEND_API_KEY` (or SMTP_*) for real OTP/reset emails — otherwise
codes print to the Space logs. `GOOGLE_CLIENT_ID` for the Google button.
Payments stay in sandbox unless you set `PAYMENTS_MODE=live` + provider creds.

## Deploy

Push this repo to the Space (the `Dockerfile` at the root is detected
automatically). First build takes a while — it's installing torch/transformers
and baking the model. After it goes green, open the Space URL.
