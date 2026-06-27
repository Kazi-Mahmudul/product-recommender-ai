# Deploy Backend + AI Engine on Vercel (Keep GCP)

This repo currently has:
- `app/` = FastAPI backend (previously deployed on GCP)
- `backend/gemini_service/` = Node/Express Gemini parsing service (previously deployed on GCP)

Goal: deploy both as **separate Vercel projects**, while keeping the GCP files/config in the repo.

## What Was Added/Changed

Backend (FastAPI):
- `api/index.py` (Vercel Python entrypoint that exports `app`)
- `vercel.json` (routes all traffic to the FastAPI app)
- `app/main.py` skips APScheduler startup when `VERCEL=1`
- `app/core/database.py` uses smaller SQLAlchemy pools on Vercel and skips the background DB verification thread

AI engine (Gemini service):
- `backend/gemini_service/vercel.json` (Vercel Node entry)
- `backend/gemini_service/index.js` no longer exits on missing `GOOGLE_API_KEY`, lazily initializes the model, does not `listen()` unless run directly, and exports the Express app

## Deploy 1: Backend (FastAPI) on Vercel

1. Create a new Vercel project and import this Git repo.
2. In Vercel Project Settings:
   - **Root Directory**: repository root (default)
   - **Framework Preset**: Other
   - Vercel will detect `vercel.json` automatically.
3. Set Environment Variables (Project Settings -> Environment Variables):
   - `DATABASE_URL` (required)
   - `ENVIRONMENT=production`
   - `DEBUG=false`
   - `SECRET_KEY` (required for auth; do not use the default)
   - `CORS_ORIGINS` (recommended)
     - JSON list or comma-separated list of allowed origins
   - `GEMINI_SERVICE_URL` (required)
     - Set this to the deployed URL of the Vercel AI engine (see Deploy 2)
   - Optional but common:
     - `SENTRY_DSN`
     - `REDIS_ENABLED=false` (if you are not using Redis)
     - `FORCE_HTTPS=true`

4. Deploy.

After deploy:
- Backend health: `https://<your-backend>.vercel.app/api/v1/health`
- API docs: `https://<your-backend>.vercel.app/api/v1/docs`

## Deploy 2: AI Engine (Gemini Service) on Vercel

1. Create a second Vercel project (separate from the backend).
2. Import the same Git repo again.
3. In Vercel Project Settings:
   - **Root Directory**: `backend/gemini_service`
   - **Framework Preset**: Other
   - Vercel will use `backend/gemini_service/vercel.json`.
4. Set Environment Variables:
   - `GOOGLE_API_KEY` (required)
   - `GEMINI_MODEL_VERSION` (optional, default is `gemini-3-flash-preview`)
   - `NODE_ENV=production`

5. Deploy.

After deploy:
- AI engine health: `https://<your-ai>.vercel.app/health`
- Main parsing endpoint: `POST https://<your-ai>.vercel.app/parse-query`

## Wiring Backend -> AI Engine

Once the AI Engine is deployed, set the backend env var:
- `GEMINI_SERVICE_URL=https://<your-ai>.vercel.app`

Redeploy the backend after updating the variable.

## Local Run (Optional)

Backend:
- `python -m uvicorn app.main:app --reload --port 8000`

AI engine:
- `cd backend/gemini_service`
- `npm install`
- `npm run dev`

## Notes / Vercel Constraints

- Vercel is serverless: background schedulers are disabled (`VERCEL=1`).
- Keep DB pools small to avoid exhausting Postgres connections (handled in `app/core/database.py` when `VERCEL=1`).
- If `DATABASE_URL` is missing or unreachable in production on Vercel, the backend fails fast (to avoid silently using an in-memory DB).

