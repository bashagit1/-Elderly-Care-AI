<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Elderly Care Watch AI — WhatsApp Bot

This repository contains a WhatsApp automation agent (using `whatsapp-web.js`) used by the Elderly Care Watch AI project. The bot runs an Express server that exposes endpoints to check status, retrieve QR codes, list groups, and send updates to WhatsApp groups.

## Key files
- `server/bot.js` — WhatsApp bot server and API endpoints.
- `Dockerfile` — optional container for running Puppeteer reliably.
- `.env.example` — example environment variables.
- `Procfile` — simple `web: npm start` for Railway/heroku-style hosts.

## Quick local run
1. Install deps:
```powershell
npm install
```
2. Copy `.env.example` to `.env` and set values (see section below).
3. Start server:
```powershell
npm start
```
4. Visit `http://localhost:3001/` for health and `http://localhost:3001/qr/png` to scan the QR.

## Environment variables
- `PORT` — server port (default `3001`).
- `SESSION_PATH` — path where `whatsapp-web.js` stores session files (default `./wwebjs_auth`).
- `API_KEY` — Gemini/AI key (optional).
- `SUPABASE_URL` — Supabase project URL for session persistence (optional).
- `SUPABASE_KEY` — Supabase service key with storage permissions (optional).
- `SUPABASE_BUCKET` — bucket name for session tarballs (default `wwebjs-sessions`).
- `SESSION_ID` — identifier for the session archive (default `default`).

## Deploying to Railway
Two common options:

1) GitHub → Railway
- Push your repo to GitHub (see instructions below), then in Railway create a new project from GitHub and select this repo.
- Add environment variables in Railway's project settings (`Settings` → `Variables`): `PORT`, `SESSION_PATH`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_BUCKET`, `SESSION_ID` (if using Supabase session persistence).
- Optionally attach a persistent volume in Railway and set `SESSION_PATH` to that volume path (recommended to avoid re-scanning QR after redeploys).

2) Docker deployment on Railway
- Use the included `Dockerfile` for a reproducible Chromium environment. In Railway, create a new project and connect the Dockerfile build.
- Set env vars as above.

### Supabase session persistence notes
- Create a storage bucket (e.g. `wwebjs-sessions`) and give your service key storage permissions.
- The bot will attempt to download `SESSION_ID.tar.gz` from the bucket on startup and extract it to `SESSION_PATH`. On auth or shutdown it uploads the session back to Supabase.
- Railway volumes + `SESSION_PATH` is the preferred approach for reliability.

## Git & GitHub
To push this repo to GitHub (one-time setup):
```powershell
# initialize git (if not already)
git init
git add .
git commit -m "Initial bot + deploy configs"
# create a GitHub repo and add the remote (replace <your-repo-url>)
git remote add origin <your-repo-url>
git branch -M main
git push -u origin main
```

If you'd like, I can create the GitHub repo and push for you; provide a repository URL or a GitHub token.

## Docker
Build locally:
```powershell
docker build -t elderly-care-bot:latest .
```
Run locally:
```powershell
docker run -e PORT=3001 -p 3001:3001 -v ./wwebjs_auth:/app/wwebjs_auth elderly-care-bot:latest
```

## Next steps I can help with
- Push this repository to GitHub for you (requires your approval and repo URL or token).
- Create a Railway project and deploy (I can provide step-by-step or try to create it if you provide Railway/GitHub access tokens).
- Implement automated session sync improvements (e.g., encrypted session storage).

Let me know which of the above you'd like me to do next.
