# Fat Loss Tracker

Vue 3 + Express tracker for weekly workouts, cardio, and weight loss backed by PostgreSQL.

## Features
- Four-day program (push/legs/pull/core) with exercise checklists, cardio toggle, notes, and kcal tally.
- Progress view with calendar, recent history, weekly streak, and totals.
- Weight logging with delete + chart (chart renders after at least two weight entries).
- Health endpoint at `/api/health` for uptime checks.

## Stack
- Backend: Express 5, PostgreSQL (`pg`), CORS, dotenv, Nodemon for dev.
- Frontend: Vue 3, Vite, Tailwind CSS, Chart.js.
- Deployment: Vercel serverless (via `serverless-http`) for the API, static build for the client.

## Requirements
- Node 18+ and npm.
- PostgreSQL running locally or remotely.

## Setup & Run locally
1) Install deps  
```
cd server && npm install
cd ../client && npm install
```

2) Env vars  
- `server/.env`  
```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fatlow
PORT=4000
CLIENT_ORIGIN=http://localhost:5173   # match the Vite URL; Vite will bump the port if 5173 is busy
DB_SSL=false
```
- `client/.env`  
```
VITE_API_URL=http://localhost:4000
```

3) Database  
```
createdb fatlow                             # or any name matching DATABASE_URL
psql "$DATABASE_URL" -f server/schema.sql   # seeds workout_sessions and weights tables
```

4) Start dev servers (two terminals)  
- Backend: `cd server && npm run dev` (http://localhost:4000).  
- Frontend: `cd client && npm run dev` (Vite prints the URL; open it in the browser).

## Deploy to Vercel
- Provided `vercel.json` builds `server/api/index.js` with `@vercel/node` and the client with `@vercel/static-build`.
- Set Vercel envs: `DATABASE_URL`, `DB_SSL=true` (for hosted Postgres), `CLIENT_ORIGIN=https://your-domain.vercel.app`, `VITE_API_URL=/api`.
- Vercel uses `npm --prefix server install && npm --prefix client install` then `npm --prefix client run build`.
- Local preview: `vercel dev` from repo root (requires `server/.env` and local Postgres).

## Troubleshooting
- If Vite chooses a different port (e.g., 5174), update `CLIENT_ORIGIN` and restart the backend.
- CORS errors usually mean `CLIENT_ORIGIN` or `VITE_API_URL` mismatch.
- Chart missing? Add at least two weight entries so the dataset has enough points.
