# WriteArena — what the app does (confirm before deploying)

A real-time, competitive writing platform. Writers join topic rooms, write against
a clock on a shared prompt, and every submission is scored by an NLP pipeline for
originality, authentic voice, and quality — then fed into a game layer of XP,
ranks, streaks, badges, and leaderboards.

Below is the full walkthrough, step by step.

## 1. Landing & sign-up
- Public landing page with a 3D typewriter hero and the ten niche **3D icons**.
- **Register** → the account is created as *unverified* and a **6-digit code is
  emailed** to the user.
- **Verify email** → enter the code (6-box entry, paste + resend supported) → the
  account activates and the user is signed in.
- **Login** → unverified users are sent back to verify. **Forgot password** emails a
  reset code (same email pipeline).

## 2. Choosing a room
- **Rooms** page: ten niches (technology, society, literature, science, politics,
  business, sports, health, entertainment, arts), each shown as an interactive
  **3D icon** that floats, spins, and reacts to hover. Live rooms are marked.
- Filter by niche; **Join** to enter, or **Watch** to spectate.

## 3. The lobby (waiting room)
- Shows who's present, a live chat, and the **session time**: how long a session
  runs, or — if one is already live — a countdown and a "Join the session" button
  so late-joiners get the correct remaining clock.

## 4. The writing arena
- The host starts a session; everyone moves into the arena with a synced countdown.
- The prompt is a **live trending topic** (see §7). Ruled-paper writing surface,
  per-keystroke typewriter sound, paste disabled, auto-save, and a draining timer.
- On submit (or when the timer ends) the work is sent for scoring.

## 5. Scoring — three readings + a combined result
Every submission is analysed on three independent signals, shown **individually**:
- **Plagiarism** — TF-IDF similarity vs recent submissions (lower is better).
- **AI detection** — a fine-tuned RoBERTa transformer estimates how likely the text
  is machine-generated (lower is better).
- **Quality** — readability, vocabulary richness, sentence variety, structure
  (spaCy + readability metrics).

Then a **combined score** card shows exactly how they're weighted and summed:
`final = ((1 − plagiarism) × 0.40 + (1 − AI) × 0.30 + quality × 0.30) × 100`,
with each component's contribution, the final score, a letter grade, and a written
note.

## 6. Gamification
- **XP** from every scored submission; **levels** and **ranks** (bronze → diamond).
- **Streaks** for writing on consecutive days.
- **Badges** — earned automatically (first session, 10/50 sessions, high scores,
  streaks, followers, XP milestones), each shown as an interactive **3D medallion**
  tinted by rarity.
- **Leaderboards** — global and per-niche.

## 7. Live trending topics (web-scraped)
- Room prompts and the daily challenge are generated from **live trending
  headlines**, scraped per niche from Google News RSS and turned into writing
  prompts — refreshed shortly after startup, every 3 hours, and whenever a room
  session starts.
- If the feed is ever unreachable (e.g. blocked), it falls back to a built-in set so
  a room is never empty. (Admins can also trigger a manual refresh.)

## 8. Daily challenge
- A trending prompt of the day with a **live countdown timer** — begin, write, and
  it auto-submits when time runs out. A daily leaderboard tracks the top entries.

## 9. Tournaments
- Weekly tournaments, bracket events, and the daily challenge, shown as animated
  cards with 3D emblems and status badges.

## 10. Social layer
- **Feed** of public submissions; **follow** other writers; **like** and **comment**;
  direct **messaging**; **notifications** for follows, likes, comments, and awards.

## 11. Profile & analytics
- Public profiles (bio, avatar, stats, badges, recent work).
- **Analytics** dashboard: score trends over time, per-niche performance, and
  activity, with animated charts.

## 12. Admin panel
- Manage rooms, moderate users (ban/suspend), and review platform activity.
- The seeded admin account is pre-verified.

## 13. Under the hood
- **Frontend:** React 18 + Vite, Three.js 3D icons, Framer Motion, Chart.js.
- **Backend:** FastAPI, SQLAlchemy, PostgreSQL, JWT auth, WebSockets for real-time.
- **NLP:** scikit-learn (TF-IDF), HuggingFace Transformers (RoBERTa), spaCy + textstat.
- **Deploy:** single container (backend serves the built frontend) — ready for
  Hugging Face Spaces. Database on Neon (cloud PostgreSQL).

---

If this matches what you want, we'll deploy it. If anything here is wrong or missing,
tell me before we push to Hugging Face.
