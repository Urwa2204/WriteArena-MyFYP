# Deploying WriteArena free (Hugging Face Space + Neon Postgres)

The whole app runs as **one** Hugging Face Docker Space; the database lives on
**Neon**. This handles both Space gotchas:

- **Ephemeral filesystem** → the DB is external (Neon), and the ML models are
  baked into the image at build time (see `Dockerfile`), so nothing important
  depends on runtime disk writes.
- **Sleep after 48h idle** → optional keep-warm workflow
  (`.github/workflows/keep-warm.yml`).

## 1. Create the database (Neon)

1. Sign up at neon.tech (no card), create a project + a database named
   `writearena`.
2. Copy the **pooled** connection string (the host contains `-pooler`) and add
   `?sslmode=require` if it isn't already there. This is your `DATABASE_URL`.
   The app already sets `pool_pre_ping=True`, so it reconnects fine after Neon
   auto-suspends.

## 2. Create the Space (Hugging Face)

1. huggingface.co → New Space → **SDK: Docker** → name it (e.g. `writearena`).
2. Push this repository to the Space's git remote. Copy the front-matter from
   `README_HF_SPACE.md` to the top of the Space's `README.md` (HF needs
   `sdk: docker` and `app_port: 7860` there).
3. In the Space → Settings → *Variables and secrets*, add the secrets listed in
   `README_HF_SPACE.md` (`DATABASE_URL`, `SECRET_KEY`, `ADMIN_EMAIL`,
   `ADMIN_PASSWORD`, `PUBLIC_BASE_URL`, `CORS_ORIGINS`).
4. Wait for the build (first one is slow — it installs torch/transformers and
   bakes the detector model). When it's green, open the Space URL.

Because the frontend is served by FastAPI and the API base is relative (`/`)
with the WebSocket using `window.location.host`, everything is same-origin —
no frontend changes and no CORS wrangling needed.

## 3. Keep it awake (optional)

If you host the source on GitHub too, set a repo **variable** `SPACE_URL` to
your Space URL and the included `keep-warm` workflow pings `/health` every 6h.
Or just run it manually (Actions → keep-warm → Run) a few minutes before a demo.

## Notes / limits on the free tier

- CPU Basic Space: 2 vCPU / 16 GB RAM, no cost, no card. Enough to load the
  transformer.
- Neon free: 0.5 GB storage, auto-suspends when idle (wakes on connect).
- Uploaded avatars are stored as data URLs in the DB, so they survive restarts;
  anything written to local disk at runtime does not.
- To run without the heavy transformer (e.g. on a smaller host), the
  AI-detector already falls back to a lightweight heuristic automatically if the
  model can't load — the app still works, just with a simpler detector.
