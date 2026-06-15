# Installation — self-hosted

Run **Household Budget** with PostgreSQL and the included Hono API. No Supabase or Netlify required.

## Requirements

- **Docker** 24+ and Docker Compose v2 (recommended), or
- **Node.js** 20+ and **PostgreSQL** 16+ installed locally
- ~2 GB free RAM

---

## Quick install (Docker + local dev)

```bash
git clone https://github.com/javier-marroquin/hearth-budget.git
cd hearth-budget
chmod +x scripts/install.sh
npm run install:self-hosted
```

Then in **two terminals**:

```bash
# Terminal 1 — API (port 3000)
npm run dev:api

# Terminal 2 — Frontend (port 5173)
npm run dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:5173 |
| API health | http://localhost:3000/api/health |
| Mailpit (dev email) | http://localhost:8025 |
| PostgreSQL | `localhost:5432` |

**Demo user** (when `SEED_DEMO_USER=true`):

- Email: `demo@local.dev`
- Password: `demo1234`

---

## Without Docker (macOS)

If you see `command not found: docker`:

### Option A — Docker Desktop

1. [Install Docker Desktop for Mac](https://docs.docker.com/desktop/setup/install/mac-install/)
2. Start Docker Desktop
3. `docker compose --profile dev up -d db mailpit`

### Option B — Homebrew PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16
npm run db:setup-local   # creates DB, updates .env
npm run db:migrate
npm run db:seed
npm run dev:api
npm run dev
```

`db:setup-local` uses your Mac username (`whoami`), not the Docker `app` user.

Example `.env`:

```env
DATABASE_URL=postgres://youruser@localhost:5432/household_budget
AUTH_SECRET=dev-secret-change-me-min-16-chars
VITE_API_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:5173
```

---

## Manual install (no install script)

```bash
cp .env.example .env
# Edit DATABASE_URL and AUTH_SECRET

docker compose --profile dev up -d db mailpit
npm install
npm run db:migrate
npm run db:seed
npm run dev:api   # terminal 1
npm run dev       # terminal 2
```

---

## Production

See **[docs/DEPLOY.md](./docs/DEPLOY.md)** for TLS, reverse proxy, and production env vars.

Quick path:

```bash
cp .env.example .env
# Set: DB_PASSWORD, AUTH_SECRET, APP_URL, CORS_ORIGIN, COOKIE_SECURE=true

docker compose up -d db api
npm run build
# Serve dist/ behind nginx/Caddy with /api → api:3000
```

---

## Environment variables

See [`.env.example`](./.env.example). Essential:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Session signing key (min. 16 chars) |
| `CORS_ORIGIN` | Frontend origin (for cookies) |
| `APP_URL` | Public app URL |
| `VITE_API_URL` | API URL baked into frontend build |

Auth details: [docs/AUTH_SETUP.md](./docs/AUTH_SETUP.md)

---

## API overview

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/health` | Service + DB status |
| `POST` | `/api/auth/sign-up` | `{ email, password, fullName? }` |
| `POST` | `/api/auth/sign-in` | `{ email, password }` |
| `POST` | `/api/auth/sign-out` | Clears session cookie |
| `GET` | `/api/auth/me` | Current user |
| `*` | `/api/households/...` | Households, members, KPIs, CRUD resources |

Session cookie: `hb_session` (`httpOnly`).

### Test with curl

```bash
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@local.dev","password":"demo1234"}'

curl -b cookies.txt http://localhost:3000/api/auth/me
```

---

## Database migrations

Migrations live in [`db/migrations/`](./db/migrations/) and run via:

```bash
npm run db:migrate
npm run db:seed      # optional demo user
```

Applied automatically when the API starts in development.

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `DATABASE_URL` / `AUTH_SECRET` required | `cp .env.example .env` in repo root |
| `command not found: docker` | Docker Desktop or Homebrew Postgres (above) |
| `role "app" does not exist` | Without Docker: `npm run db:setup-local` |
| Login CORS error | `CORS_ORIGIN` must match frontend URL exactly |
| Failed to fetch on login | Is `npm run dev:api` running? |
| Migration fails | Check API logs; report SQL file in GitHub issues |

---

## Contributing

1. Fork → branch → PR
2. Run `npm run install:self-hosted` before developing
3. Never commit `.env` or secrets
