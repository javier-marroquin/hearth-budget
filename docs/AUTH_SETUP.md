# Auth setup — email & password (self-hosted)

Authentication uses **email + password** via the Hono API in `server/`. Sessions are stored in an `httpOnly` cookie (`hb_session`).

## Environment

Root `.env`:

```env
DATABASE_URL=postgres://...
AUTH_SECRET=dev-secret-change-me-min-16-chars   # min 16 chars; use openssl rand -base64 32 in prod
APP_URL=http://localhost:5173
API_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173
COOKIE_SECURE=false
```

Frontend (Vite):

```env
VITE_API_URL=http://localhost:3000
VITE_APP_URL=http://localhost:5173
```

In dev, Vite proxies `/api` → port 3000 so cookies work on one origin.

## Local flow

```bash
npm run db:migrate
npm run db:seed          # optional: demo@local.dev / demo1234
npm run dev:api            # terminal 1
npm run dev                # terminal 2
```

1. Open http://localhost:5173/login
2. Sign up or use demo credentials
3. Onboarding (create household) → dashboard

## Invitations

Admins call `POST /api/invite-member` with `{ household_id, email, role }`.

- **Dev**: invite URL is logged in the API console
- **Prod**: configure SMTP — see [EMAIL_SETUP.md](./EMAIL_SETUP.md)

Accept: open `/invite?token=…` while signed in as the invited email (or sign up first).

## Production

- Set `COOKIE_SECURE=true` (HTTPS only)
- Use a strong `AUTH_SECRET`
- Serve frontend and `/api` on the **same origin** — see [DEPLOY.md](./DEPLOY.md)

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Failed to fetch on login | Start `npm run dev:api` |
| 401 on API calls | Cookie blocked — check CORS / same origin |
| Invalid `AUTH_SECRET` | At least 16 characters |
