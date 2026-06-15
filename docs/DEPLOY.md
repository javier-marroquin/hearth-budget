# Production deployment (self-hosted)

Household Budget is designed to run on **your own infrastructure**: PostgreSQL + Hono API + static frontend.

## Overview

```
                    ┌──────────────┐
   Users ──HTTPS──► │ Caddy/nginx  │
                    │  + TLS       │
                    └───┬──────┬───┘
                        │      │
              static    │      │  /api/*
              dist/     │      ▼
                        │   ┌──────────┐     ┌────────────┐
                        │   │ Hono API │────►│ PostgreSQL │
                        │   │ :3000    │     │ :5432      │
                        │   └──────────┘     └────────────┘
                        ▼
                   index.html + assets
```

## 1. Build

```bash
npm ci
npm run db:migrate    # against production DATABASE_URL
npm run build         # outputs dist/
```

The API runs separately (`npm run start` in `server/` or Docker image from `server/Dockerfile`).

## 2. Environment (production)

```env
NODE_ENV=production
DATABASE_URL=postgres://user:password@db-host:5432/household_budget
AUTH_SECRET=<openssl rand -base64 32>
APP_URL=https://budget.example.com
API_URL=https://budget.example.com
CORS_ORIGIN=https://budget.example.com
COOKIE_SECURE=true
SESSION_DAYS=30
SEED_DEMO_USER=false

# Frontend build-time (Vite)
VITE_API_URL=https://budget.example.com
VITE_APP_URL=https://budget.example.com
VITE_APP_NAME=Household Budget
```

Generate secrets:

```bash
openssl rand -base64 32   # AUTH_SECRET
```

## 3. Docker Compose (API + database)

```bash
cp .env.example .env
# Edit DB_PASSWORD, AUTH_SECRET, APP_URL, CORS_ORIGIN, COOKIE_SECURE=true

docker compose up -d db api
npm run build
# Serve dist/ via reverse proxy (below)
```

See [INSTALL.md](../INSTALL.md) for Mailpit/dev profile and local Postgres without Docker.

## 4. Reverse proxy (Caddy example)

Serve the SPA and proxy API on one origin (required for session cookies):

```caddy
budget.example.com {
    handle /api/* {
        reverse_proxy localhost:3000
    }
    handle {
        root * /var/www/household-budget/dist
        try_files {path} /index.html
        file_server
    }
}
```

Same-origin `/api` avoids CORS cookie issues in production.

## 5. Email (optional)

- **Development**: Mailpit via `docker compose --profile dev up -d mailpit`
- **Production**: configure SMTP on the API (`SMTP_HOST`, `SMTP_PORT`) or extend the server to use Resend — see [EMAIL_SETUP.md](./EMAIL_SETUP.md)

Invites work without email in dev (invite URL is logged to the API console).

## 6. Recurring jobs (cron)

Until built-in schedulers ship in the API, call materialize daily:

```bash
# Example: cron as a household admin session or service token (future)
curl -X POST https://budget.example.com/api/households/HOUSEHOLD_ID/recurring-templates/materialize \
  -H "Cookie: hb_session=..." 
```

Or use the **Sync now** button on **Schedules** in the UI.

## 7. Smoke test

1. Open `https://budget.example.com`
2. Sign up or sign in
3. Create a household → add an expense → check dashboard KPIs
4. `GET https://budget.example.com/api/health` → `{ "ok": true }`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Login works locally but not prod | `CORS_ORIGIN` + `APP_URL` must match browser URL; `COOKIE_SECURE=true` requires HTTPS |
| API 502 | Check API container/logs; verify `DATABASE_URL` |
| Blank page after refresh | Configure SPA fallback (`try_files … /index.html`) |
| `AUTH_SECRET` error | Minimum 16 characters |
