# WriteArena — Project Files

A file-by-file tour of the whole project. The **frontend** (the rebuilt part) is
covered in depth; the **backend** is covered module by module so you can see how
the data the UI relies on is produced.

---

## Frontend

React 18 + Vite 5. Entry: `index.html` -> `src/main.jsx` -> `src/App.jsx`.

### Root & config

| File | What it does |
|------|--------------|
| `frontend/index.html` | HTML shell. Loads the **Fraunces** + **Inter** Google Fonts and mounts the app at `#root`. |
| `frontend/vite.config.js` | Dev server on port 3000 and the proxy table that forwards `/auth`, `/users`, `/rooms`, `/feed`, `/social`, `/messages`, `/notifications`, `/analytics`, `/tournaments`, `/admin`, `/health`, and the `/ws` websocket to the backend on port 8000. |
| `frontend/package.json` | Scripts (`dev`, `build`, `preview`) and dependencies, including the added `three`, `@react-three/fiber`, `@react-three/drei`, `gsap`, `chart.js`, `react-chartjs-2`, `lottie-react`. |

### App bootstrap (`src/`)

| File | What it does |
|------|--------------|
| `main.jsx` | React entry. Imports `index.css`, **registers the Chart.js components** used app-wide (scales, elements, Doughnut/Bar/Line/Radar controllers, Filler, Tooltip), and calls `applyChartTheme()` so charts pick up CSS-variable colours. Wraps the app in `ThemeProvider` and `AuthProvider`. |
| `App.jsx` | The React Router route table. Public routes (Landing, Login, Register, ResetPassword), authed routes guarded by a `RequireAuth` wrapper (Dashboard, Rooms, Lobby, Arena, Results, Feed, Profile, Leaderboard, Badges, Analytics, Messages, Tournaments, DailyChallenge, Notifications, Settings, Spectator, EditProfile), and admin routes. |
| `index.css` | **The entire design system.** CSS custom properties for the cream/pastel palette and a `[data-theme="dark"]` deep-plum override; typography (Fraunces + Inter); the reusable `.wa-card`, `.btn`, `.badge`, `.pill`, `.input`, `.tabs/.tab`, `.lrow`, `.ink` (conic-gradient ink-pot with swirl), grade seals, the sidebar, XP bar, streak display, spinner, `.eyebrow`, and a `prefers-reduced-motion` block. All legacy class names from the original build (`.glass`, `.glass-gold`, `.stat-card`, `.lb-row`, `.logo-mark`, `.timer`, `.ambient-particle`, ...) are re-skinned here so any screen that was not bespoke-rebuilt still inherits the new look. |

### Services, context, hooks

| File | What it does |
|------|--------------|
| `services/api.js` | The Axios instance. Root-relative `baseURL`, attaches the JWT `Authorization` header from `localStorage`, and handles 401 -> token refresh / logout. **Unchanged** by the rebuild. |
| `context/AuthContext.jsx` | Auth state. `login` / `register` store tokens and return the user object; `logout` clears storage; `refreshUser` re-fetches `/users/me`. **Unchanged.** |
| `context/ThemeContext.jsx` | Holds the `light` / `dark` theme, writes `data-theme` to `<html>`, and persists the choice. Consumed by the sidebar toggle. |
| `hooks/useWebSocket.js` | Opens the `/ws/{roomId}` connection, exposes `send()`, and dispatches incoming messages to `onConnect` / `onMessage`. Drives the lobby, arena, and spectator. **Unchanged.** |
| `hooks/useToast.js` | Tiny toast store (`toast()`, `remove()`, `toasts`) rendered by `ToastContainer`. |
| `hooks/useCountUp.js` | Animates a number from 0 to a target over a duration (used by the stat cards and the score gauge). Respects reduced-motion by snapping to the final value. |

### Libraries added for the rebuild (`src/lib/`)

| File | What it does |
|------|--------------|
| `lib/sound.js` | The **Web Audio typewriter engine**. Lazily creates an `AudioContext` (`primeAudio()` on first interaction), and `playForChar(ch)` synthesizes a short percussive click — a deeper "thunk" for space, a "ding + carriage" for newline, varied pitch per key. `nextKeyIndex()` returns which on-screen key to animate. Silent under `prefers-reduced-motion`. No audio files. |
| `lib/avatarStore.js` | Device-local avatars. `fileToAvatarDataUrl(file)` draws the chosen image to a canvas, center-crops to a square, and exports a compressed JPEG data URL; `setLocalAvatar` / `getLocalAvatar` persist it in `localStorage` keyed by `user_id` and emit a `wa-avatar-changed` event; `uploadAvatarLocally` ties the two together. |
| `lib/chartTheme.js` | Bridges CSS variables into Chart.js. `palette()` reads the current theme's ink colours; `verticalGradient()` builds the soft fill under the analytics line; `applyChartTheme()` sets Chart.js global font/colour defaults. |

### Shared components (`src/components/`)

| File | What it does |
|------|--------------|
| `common/Icon.jsx` | A single SVG line-icon set (dashboard, rooms/quill, feed, leaderboard, tournaments, messages, analytics, badges, admin, bell, flame, sun, moon, upload, camera, ...). Replaces emoji throughout the UI. |
| `common/Avatar.jsx` | The shared avatar. Prefers a locally-uploaded picture, then the server `avatar_url`, then a serif initial on a tinted disc. Re-renders when `wa-avatar-changed` fires. |
| `common/Motion.jsx` | Framer Motion helpers: `PageMotion` (page fade/slide-in wrapper), `staggerContainer` / `staggerItem` (list reveals), and `scrollReveal` (reveal-on-scroll props). |
| `charts/ScoreGauge.jsx` | A Chart.js doughnut used as a 270-degree radial gauge for a 0-100 score, with the grade and a counting number in the centre. Used on Results. |
| `charts/SubScoreBars.jsx` | Chart.js horizontal bars for the three sub-scores — mint = originality, sky = authentic voice, lavender = quality — animating from zero. |
| `landing/Typewriter3D.jsx` | The **3D typewriter** (react-three-fiber). Body, platen, paper, key grid, hammer, and feet built from primitives in the pastel palette. On mount the parts start scattered and a **GSAP** timeline snaps them into place (2.2s, staggered). It then floats and sways gently (keeping the paper facing the viewer), can be dragged to spin, presses the right key as you type, and renders your live text on the paper via a `drei` HTML overlay. Wrapped in an error boundary that falls back to a paper card if WebGL is unavailable. Lazy-loaded so three.js only ships on the landing route. |
| `layout/Sidebar.jsx` | The persistent left navigation: serif wax-seal brand, SVG nav items with a lavender active state, the light/dark toggle, and the current user's avatar. |
| `layout/AppLayout.jsx` | The shell for every authed page: sidebar + top bar (streak flame, notification bell) + the toast container, with the page content as children. |
| `notifications/NotificationBell.jsx` | Polls `/notifications`, shows an SVG bell with a blush unread dot, and a dropdown with "mark all read". |
| `notifications/ToastContainer.jsx` | Renders the stack of toasts from `useToast`. |

### Pages (`src/pages/`)

Bespoke rebuilds (pastel design, preserved data/logic):

| File | What it does |
|------|--------------|
| `Landing.jsx` | Public hero. Lazy-loads `Typewriter3D`, captures the visitor's real keystrokes (paper + sound + key animation), and shows the ink-pot niches (3D-tilt cards), a "how it works" 01/02/03, a leaderboard ledger preview, and the footer line. |
| `Login.jsx` | Split layout: a pastel brand panel beside the sign-in form. Same `login()` flow. |
| `Register.jsx` | Three-step sign-up with a **tour panel that syncs to the step**. Step 1 account, step 2 display details + niche "inks", step 3 browse-upload a display picture. Persists the chosen avatar to the new user on success. |
| `Dashboard.jsx` | Count-up stat cards, the XP-to-next-level bar, live rooms, the daily challenge, and quick actions. |
| `Rooms.jsx` | The ink-pot room grid with niche-coloured swirls, 3D tilt on hover, niche filter pills, a 10s live refresh, and join/watch. |
| `Lobby.jsx` | The "waiting chamber": writers orbit a pulsing central podium (Framer Motion), with live members and lobby chat over the websocket; navigates to the arena on `session_start`. |
| `Arena.jsx` | The focused writing room: a ruled paper sheet with a red margin, a draining **time vial** (mint -> peach -> blush), a filling **word inkpot** in the room's ink, house rules, typewriter sound per keystroke, paste disabled, and the preserved timer / 30s autosave / submit / websocket `session_end` handling. |
| `Results.jsx` | Polls `/feed/submission/{id}` every 3s. The manuscript "illuminates" from grey to a gold-pastel gradient when the score arrives; a spring-in grade seal, a Chart.js gauge, and animated sub-score bars; tabs for overview / plagiarism / AI detection / quality, each with its own gauge and the typed-out AI feedback. |
| `Leaderboard.jsx` | A top-3 podium with rank seals (Roman numerals, no medal emoji) and the full ledger below. |
| `Badges.jsx` | Wax-seal SVG medallions whose colour reflects rarity (legendary/epic/rare/common), with earned vs locked states. |
| `Profile.jsx` | Cover + avatar with a **browse-to-upload** camera button (own profile), pen name, rank, stats, follow/unfollow, and History / Badges tabs. |
| `Analytics.jsx` | Count-up stats, a Chart.js gradient line (score over time), a Chart.js radar (skill mix), and a lavender-opacity activity calendar. |

Secondary pages (kept on their original logic; they inherit the re-skinned
design system, so they match the new look):

| File | What it does |
|------|--------------|
| `Feed.jsx` | Explore / following feeds with niche + sort filters, like, and open-submission. |
| `Messages.jsx` | Two-pane direct messages with 5s polling. |
| `Tournaments.jsx` | Weekly / bracket / daily-challenge tabs and their leaderboards. |
| `DailyChallenge.jsx` | Stand-alone writing surface for the day's prompt; submits and routes to Results. |
| `Notifications.jsx` | Full notification list with type glyphs. |
| `Settings.jsx` | Account / preferences, including the theme preview swatches. |
| `Spectator.jsx` | Watch a live room over the websocket. |
| `EditProfile.jsx` | Edit display name, pen name, bio, location, and interests. |
| `ResetPassword.jsx` | Request / complete a password reset. |
| `NotFound.jsx` | 404. |
| `admin/AdminDashboard.jsx` | Admin overview metrics. |
| `admin/AdminRooms.jsx` | Create / manage rooms. |
| `admin/AdminUsers.jsx` | Manage users and roles. |

---

## Backend

FastAPI + SQLAlchemy + PostgreSQL, served by `backend/main.py`. **Not modified by
the frontend rebuild** — described here so the data contracts are clear.

### Top level

| File | What it does |
|------|--------------|
| `main.py` | Creates the FastAPI app, CORS, and includes every router under `app/api/`. Exposes `/health` and the `/docs` OpenAPI UI. |
| `requirements.txt` | Python dependencies (FastAPI, SQLAlchemy, Alembic, psycopg, transformers/torch, spaCy, scikit-learn, passlib, python-jose, ...). |
| `alembic.ini`, `alembic/` | Database migrations. `alembic upgrade head` builds the schema; `env.py` wires Alembic to the models and `DATABASE_URL`. |
| `.env` | Runtime config: `DATABASE_URL`, `SECRET_KEY`, token lifetimes, seed admin credentials, the HuggingFace model name, and `ENV`. |

### `app/core/` — configuration & security

| File | What it does |
|------|--------------|
| `config.py` | Loads settings from `.env` into a typed settings object. |
| `security.py` | Password hashing and JWT create/verify helpers. |
| `dependencies.py` | FastAPI dependencies: DB session, `get_current_user`, admin guard. |
| `rate_limit.py` | Request rate limiting. |

### `app/db/` — data layer

| File | What it does |
|------|--------------|
| `database.py` | SQLAlchemy engine, session factory, and the `get_db` dependency. |
| `models.py` | All ORM models: User, Room, Session, Submission, Score, Badge/UserBadge, Follow, Message, Notification, Tournament, etc. Note `User.avatar_url` is `String(500)`, which is why uploaded images are stored client-side rather than inline. |

### `app/api/` — HTTP + websocket routes

| File | Endpoints (frontend usage) |
|------|----------------------------|
| `auth.py` | `/auth/register`, `/auth/login`, refresh, password reset — used by AuthContext, Login, Register, ResetPassword. |
| `users.py` | `/users/me`, `/users/{id}`, `/users/leaderboard`, `/users/{id}/badges`, `/users/{id}/history`, follow/unfollow — Profile, Leaderboard, Badges, Dashboard. |
| `rooms.py` | List/get rooms, join, spectate, and `POST /rooms/{id}/submit` — Rooms, Lobby, Arena, DailyChallenge. |
| `feed.py` | `/feed/explore`, `/feed/following`, and `GET /feed/submission/{id}` (the result document Results polls). |
| `social.py` | Likes / comments — Feed. |
| `messages.py` | Conversations and direct messages — Messages. |
| `notifications.py` | List + mark-read — NotificationBell, Notifications. |
| `analytics.py` | `GET /analytics/me` -> `total_sessions`, `avg_score`, `radar`, `heatmap`, `timeline` — Dashboard, Analytics. |
| `tournaments.py` | Tournaments and `/tournaments/daily-challenge` — Tournaments, Dashboard, DailyChallenge. |
| `admin.py` | Admin metrics and management — admin pages. |
| `websocket.py` | The `/ws/{roomId}` endpoint: join/leave, lobby chat, `session_start`, `typing`, `session_end` — Lobby, Arena, Spectator. |

### `app/nlp/` — the scoring pipeline

| File | What it does |
|------|--------------|
| `plagiarism.py` | TF-IDF vector similarity of a submission against recent submissions -> `plagiarism_score` (0-1). |
| `ai_detector.py` | A transformer model classifying human vs AI-generated text -> `ai_score` (0-1). |
| `quality.py` | Readability, vocabulary richness, sentence variety, and coherence via spaCy + readability metrics -> `quality_score` (0-1). |
| `feedback.py` | Generates the written `ai_feedback` shown on Results. |
| `scorer.py` | Combines the three signals into the `final_score` (0-100) and the letter `grade`. |

The frontend maps these to the three sub-scores: **Originality** = (1 - plagiarism) x 100,
**Authentic voice** = (1 - ai) x 100, **Quality** = quality x 100.

### `app/services/` — domain logic

| File | What it does |
|------|--------------|
| `session_service.py` | Creates and runs writing sessions; orchestrates scoring on submit. |
| `badge_service.py` | Awards badges when their criteria are met. |
| `streak_service.py` | Maintains daily writing streaks. |
| `otp_service.py` | One-time codes for password reset / verification. |
| `ws_manager.py` | Tracks websocket connections per room and broadcasts events. |

---

## How the pieces talk

1. A writer joins a room (`rooms.py`) and enters the **Lobby**, connected over
   `websocket.py`.
2. On `session_start` they reach the **Arena**, write, and submit to
   `POST /rooms/{id}/submit`.
3. `session_service.py` runs the **NLP pipeline** and stores a Score.
4. **Results** polls `GET /feed/submission/{id}` until the score lands, then
   renders the gauge, sub-score bars, and illuminated manuscript.
5. `badge_service.py` / `streak_service.py` update gamification, surfaced on the
   **Dashboard**, **Profile**, **Badges**, **Leaderboard**, and **Analytics**.
