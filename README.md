# FaceFind — AI-Powered Event Photo Retrieval System

FaceFind lets event photographers upload a full shoot once, and lets guests
find only the photos they appear in by uploading a selfie or scanning live.

No seeded or fake data is included — you're looking at a real, working app
with empty states until you create an account and an event yourself.

## Structure

```
FaceFind/
├── backend/     Flask API (auth, events, photos, gallery, face matching)
└── frontend/    React (Vite) app — public site, auth, dashboards, galleries
```

## Quick start

By default the backend uses **SQLite** (a local file, zero setup) and
**local disk storage** (saves to `backend/uploads/`, zero setup). No MySQL,
no Cloudflare account, no API keys needed to try it out.

**Terminal 1 — backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python app.py                   # runs on http://localhost:5000
```

**Terminal 2 — frontend:**
```bash
cd frontend
npm install
cp .env.example .env
npm run dev                     # runs on http://localhost:5173
```

Open http://localhost:5173. **Both servers need to be running** — if you see
"Can't reach the FaceFind server", terminal 1 isn't running (check that
terminal for the actual startup error).

Face matching itself needs the optional **InsightFace** package (see
below) — without it, uploads and selfies are still accepted and stored, they
just won't produce real matches, and the server logs say so on startup.

## Turning on real face matching, MySQL, and Cloudflare R2

Optional, for a production-like setup:

```bash
pip install -r requirements.txt -r requirements-full.txt
```

Face matching uses **InsightFace** (ArcFace embeddings, RetinaFace detection, run
on ONNX Runtime). There's no dlib and no CMake step. The model pack (~280 MB for
`buffalo_l`) downloads automatically the first time the server starts. On Windows,
installing `insightface` may need the Microsoft C++ Build Tools.

Tuning (in `backend/.env`): `FACE_SIMILARITY_THRESHOLD` (cosine cutoff, default
0.40; raise for fewer false matches), `FACE_MODEL` (`buffalo_l` or `buffalo_s`),
`FACE_DET_SIZE` (use 1024 for big group photos).

**Upgrading an existing database:** embeddings saved by the old dlib version are
128-d and can't be compared with InsightFace's 512-d ones, so photos uploaded
before the switch must be re-uploaded to be matchable.

Then in `backend/.env`:
- Set `DB_ENGINE=mysql` and fill in `DB_HOST`/`DB_NAME`/`DB_USER`/`DB_PASSWORD`
  (create the database first: `CREATE DATABASE facefind;`)
- Set `STORAGE_BACKEND=r2` and fill in the `R2_*` values from your
  Cloudflare dashboard

## Security model

- **Every identity claim comes from a verified JWT, never the request body.**
  Creating an event, uploading photos, and matching a selfie all read
  `user_id`/`owner_id` from the signed token attached by the frontend
  (`Authorization: Bearer ...`), not from anything the client sends directly.
  A photographer can only upload to events they own; a participant's private
  gallery only ever shows matches tied to their own token.
- Passwords are hashed with bcrypt, never stored or logged in plain text.
- Login, registration, and password-reset requests are rate-limited
  (`Flask-Limiter`) to blunt brute-force attempts. The default in-memory
  limiter is fine for local/single-process use; set `RATELIMIT_STORAGE_URI`
  to a Redis URL for a multi-worker production deployment.
- Registering an account does **not** auto-sign you in — you're sent to
  `/login` on purpose, so account creation and session creation stay as two
  distinct steps.

## What's implemented

- Public site: home, about, how it works, features, light/dark theme toggle,
  a themed illustration, and a subtle background treatment behind every page
- Auth: register (participant/photographer) → login (separate step),
  forgot/reset password with **real emails** (SMTP, or logged to console in
  dev), password hashing, show/hide password toggle, JWT sessions,
  **working "Continue with Google" OAuth** (needs your own Google Cloud
  OAuth credentials — see `.env.example`)
- Photographer: create event (generates a join code), upload photos as
  **public** (visible to all guests) or **private/match-only**, dashboard
  listing real events — all scoped to the logged-in photographer only
- Participant: join event by code, browse the public gallery, find your
  photos via a **live camera scan** or an uploaded selfie
- AI matching: InsightFace (ArcFace) face detection + 512-d embeddings,
  cosine-similarity matching against the gallery, configurable threshold (optional dependency)
- Performance: photos in a batch upload are processed **concurrently**
  (thread pool) instead of one at a time, and every upload gets a
  compressed thumbnail generated alongside the original so gallery grids
  load fast — full-resolution originals are used for downloads
- Storage: local disk by default, Cloudflare R2 (S3-compatible) optional
- Event-based access control via event codes; optional event expiry
- Structured logging on the backend (timestamps, levels, key actions) and
  consistent JSON error responses (404/429/500)

## Recent changes

- Dashboards: unchanged (only "Account settings" now links to the new page)
- **Account settings** page at `/dashboard/account` (both roles): edit name, change/set password,
  theme, clear joined-events list, delete account. Backend: `PATCH /api/auth/me`,
  `POST /api/auth/change-password`, `DELETE /api/auth/me`
- Galleries: every photo has **Preview** (full-size viewer, arrow keys/Esc) and **Download**;
  **Download all** now returns a single zip (`GET /api/gallery/<id>/private/zip` and `/public/zip`)
- New logo + illustration; light-mode header/footer tinted with the theme colour
- Fixed: "Retake" in the live scan left a black camera box

## Known scope limits (being upfront about them)

- The in-memory password-reset token store and rate limiter reset on server
  restart and don't share state across multiple backend processes — fine
  for one server, swap for a DB table / Redis if you run more than one
- Face matching compares a selfie linearly against every photo in an event.
  Fine for hundreds of photos; a very large event (thousands) would benefit
  from an indexed similarity search (e.g. FAISS) instead
- No automated tests yet
- Biometric data (face embeddings) carries real legal weight in many
  jurisdictions (GDPR, BIPA, etc.) — treat consent, retention, and deletion
  policy as a requirement before running this with real users, not an
  afterthought
