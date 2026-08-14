---
title: WriteArena
emoji: 🖋
colorFrom: purple
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---
# WriteArena

A competitive writing platform. Writers join real-time rooms, write against a
clock on a shared topic, and every submission is scored by an NLP pipeline for
**originality** (plagiarism), **authentic voice** (AI detection), and **quality**.
Scores feed a gamification layer of XP, ranks, streaks, and badges.

This repository contains a **FastAPI + PostgreSQL** backend and a **React 18 +
Vite 5** frontend. The frontend has been rebuilt around a pastel "ink & paper"
design system with a 3D typewriter, live scoring charts, and full dark/light
theming. No backend behaviour was changed during the rebuild.

---

## 1. Quick start

You need **Node.js 18+**, **Python 3.11+**, and **PostgreSQL**.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm   # first run only, for quality scoring
# Edit backend/.env (DATABASE_URL, SECRET_KEY, admin credentials ...)
uvicorn main:app --reload --port 8000
```

Tables are created automatically on startup, and any new columns are added
idempotently — no manual migration step needed.

- Backend API -> http://localhost:8000 (docs at `/docs`)

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000. The Vite dev server proxies `/auth`, `/rooms`,
`/users`, `/analytics`, `/ws`, etc. to the backend on port 8000 (see
`frontend/vite.config.js`), so no frontend `.env` is required for local work.

> The convenience scripts `setup.sh` / `setup.bat` and `start.sh` / `start.bat`
> at the repo root wrap these same steps.

### Build for production

```bash
cd frontend
npm run build      # outputs static files to frontend/dist
npm run preview    # serve the built bundle locally
```

The three.js / typewriter code is code-split into its own chunk and only
downloads on the landing page, so the rest of the app stays light.

---

## 2. New frontend dependencies

The rebuild adds these on top of the original stack (React Router, Axios,
Recharts, Framer Motion):

```bash
npm install three @react-three/fiber @react-three/drei gsap lottie-react chart.js react-chartjs-2
```

- **three / @react-three/fiber / @react-three/drei** — the 3D typewriter hero.
- **gsap** — the typewriter "assembly" animation.
- **chart.js / react-chartjs-2** — scoring gauges, sub-score bars, analytics line + radar.
- **lottie-react** — available for lightweight vector animations.
- **Recharts is retained** in package.json but the charts were migrated to chart.js.

All of this is already declared in `frontend/package.json`; a plain
`npm install` pulls everything.

---

## 3. Design system

Defined once in `frontend/src/index.css` and applied everywhere.

- **Typefaces** — *Fraunces* (serif) for every heading, brand, button, eyebrow,
  and the manuscript; *Inter* (sans) for body, labels, and data.
- **Palette** — cream paper with lavender / mint / peach / blush / butter / sky
  inks. Each writing niche owns an ink colour pair used by the ink-pots and the
  arena instruments.
- **Dark mode** — a deep-plum variant of the same palette. Toggle it from the
  sidebar; the choice is remembered (`ThemeContext`). Every page, chart, and
  component is built to read correctly in both modes.
- **Cards** — the reusable `.wa-card` (frosted glass, soft shadow, 22px radius).
- **Motion** — Framer Motion page transitions and staggered reveals, all gated
  behind `prefers-reduced-motion`.

---

## 4. Key behaviours worth knowing

- **The landing typewriter types what you type.** Start typing anywhere on the
  landing page and your real keystrokes appear on the paper, with a synthesized
  typewriter sound per key. Drag the typewriter to spin it.
- **Sound is always on.** The typewriter audio (landing + arena) is generated
  live with the Web Audio API — there are no audio files and no on/off toggle.
  It stays silent only for visitors who request reduced motion.
- **Avatar upload is device-local by design.** On your profile (and during
  sign-up) you can browse an image from your device; it is center-cropped,
  compressed to a small JPEG, and stored in the browser. This needs **zero
  backend change**. See section 5 to make avatars persist server-side.
- **Scoring is charted, not described.** Results uses a chart.js radial gauge for
  the final score and animated bars for the three sub-scores; the manuscript
  "illuminates" from grey to a gold-and-pastel gradient when the score lands.

---

## 5. Optional: real avatar uploads (server-side)

Avatars are local-only because the `users.avatar_url` column is `String(500)`
and there is no upload route — a base64 image will not fit, and the rebuild was
required not to alter the backend. To make avatars persist across devices and be
visible to other users, add a small upload route and point the frontend at it:

```python
# backend/app/api/users.py  (sketch)
from fastapi import UploadFile, File
from pathlib import Path

UPLOAD_DIR = Path("uploads/avatars"); UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/me/avatar")
async def upload_avatar(file: UploadFile = File(...), user=Depends(get_current_user), db=Depends(get_db)):
    dest = UPLOAD_DIR / f"{user.user_id}{Path(file.filename).suffix}"
    dest.write_bytes(await file.read())
    user.avatar_url = f"/static/avatars/{dest.name}"
    db.commit()
    return {"avatar_url": user.avatar_url}
```

```python
# backend/main.py — serve the files
from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory="uploads"), name="static")
```

Then change `uploadAvatarLocally` in `frontend/src/lib/avatarStore.js` to POST
the file to `/users/me/avatar` and use the returned URL.

> Note: signing out calls `localStorage.clear()`, which also clears a
> locally-stored avatar. The server-side route above avoids that.

---

## 6. Project layout

```
writearena/
├─ backend/            FastAPI app (API, NLP scoring, websockets, models)
├─ frontend/           React + Vite app (this rebuild)
├─ setup.* / start.*   Convenience scripts
└─ PROJECT_FILES.md    File-by-file explanation of the whole project
```

A complete, file-by-file description of every source file lives in
**[PROJECT_FILES.md](./PROJECT_FILES.md)**.
