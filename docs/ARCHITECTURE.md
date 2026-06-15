# Architecture

High-level overview of **Hearth** (collaborative household budgeting).

## Big picture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                     │
│  React Router · Zustand · TanStack Query · react-i18next    │
│  shadcn/ui · Tailwind · FullCalendar · Chart.js             │
│  React Hook Form · Zod · vite-plugin-pwa                    │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS  /api/*  (cookie session)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Hono API (Node 20+) — server/                  │
│  Auth · households · CRUD · KPIs · invites · recurring      │
└───────────────────────────┬─────────────────────────────────┘
                            │ SQL (pg)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16                            │
│  Migrations: db/migrations/*.sql                            │
└─────────────────────────────────────────────────────────────┘

Optional (dev): Mailpit (SMTP) · Optional (prod): SMTP / Resend
```

In development, Vite proxies `/api` → `localhost:3000` so the browser sends session cookies on the same origin.

## Layers

### 1. UI (`src/components/`)

- `ui/` — shadcn/Radix primitives (buttons, dialogs, tables, …)
- `layout/` — `AppShell`, sidebar, topbar, page header, empty states
- `forms/` — `MoneyInput`, `CategorySelect`, `MemberSelect`
- `kpi/`, `charts/` — dashboard widgets

### 2. Features (`src/features/<domain>/`)

Vertical slices: pages, hooks (TanStack Query), services (`apiFetch`), optional Zustand stores.

```
features/expenses/
├── components/   # dialogs, filters
├── hooks/        # useExpenses, useCreateExpense, …
├── pages/
└── services/     # HTTP calls to /api/...
```

### 3. Pure libraries (`src/lib/`)

No React, no network — covered by Vitest:

- `finance/calculations.ts` — savings minimum, deficit, balance
- `finance/envelopes.ts` — zero-sum envelope budgeting
- `finance/splits.ts` — expense split methods
- `finance/recurrence.ts` — recurring dates, goal targets
- `api/client.ts` — `apiFetch` with credentials
- `format.ts`, `date.ts` — locale-aware helpers

Types live in `src/lib/database.types.ts` and `src/lib/db/aliases.ts`.

### 4. API server (`server/`)

| Area | Path prefix | Notes |
|------|-------------|--------|
| Health | `/api/health` | DB ping |
| Auth | `/api/auth/*` | sign-up, sign-in, sign-out, me |
| Profile | `/api/auth/profile` | display name |
| Households | `/api/households/*` | CRUD, members, KPIs, backup |
| Resources | `/api/*` | incomes, expenses, categories, calendar, goals, … |
| Invites | `/api/invite-member`, `/api/accept-invite` | JWT invite tokens |
| Recurring | `/api/households/:id/recurring-templates/*` | templates + materialize |

Session cookie: `hb_session` (`httpOnly`, signed with `AUTH_SECRET`).

Authorisation is enforced in the API (membership + role checks), not Postgres RLS.

### 5. Database (`db/migrations/`)

Ordered SQL migrations applied on API startup (`npm run db:migrate`). Includes users/sessions, households, financial tables, calendar, recurring, notifications.

Migrations live in `db/migrations/` and run on API startup.

## Data flow example — create expense

```
ExpenseFormDialog
  └─ RHF + expenseSchema (Zod)
       └─ useCreateExpense.mutate
            └─ POST /api/households/:id/expenses  (apiFetch + cookie)
                 └─ server validates membership + role
                 └─ INSERT expenses + expense_splits
            └─ invalidateQueries(['expenses'], ['kpis'])
                 └─ Dashboard KPIs refresh
```

## State management

| Store / tool | Purpose |
|--------------|---------|
| `auth.store` | Current user |
| `household.store` | Active household (persisted) |
| `ui.store` | Sidebar, favorites, recent routes |
| `calendar.store` | View, filters |
| TanStack Query | All server data |
| React Hook Form | Forms |

## Realtime

No WebSocket layer. Calendar drag-and-drop persists via API; other tabs refresh on next query or manual navigation. `useRealtimeCalendarSync` is a no-op stub kept for future use.

## Background jobs

| Job | Status | Notes |
|-----|--------|-------|
| Materialize recurring | **Manual + API** | `POST …/recurring-templates/materialize` or UI “Sync now” on Schedules |
| Payment reminders | Planned | Cron endpoint on the API (future) |
| Monthly rollover (overdue) | Planned | Same |

For production, run a system cron or container scheduler that calls the materialize endpoint (and future job routes) daily.

## Testing

- **Vitest** — `tests/unit/` for pure finance logic
- **Playwright** — `tests/e2e/` for auth shell and navigation

## Performance

- Route-level `React.lazy()` code splitting
- Manual Vite chunks: `react-vendor`, `chart-vendor`, `calendar-vendor`
- PWA service worker caches static assets; API uses network-first via normal fetch

## Deployment

See [DEPLOY.md](./DEPLOY.md) and [INSTALL.md](../INSTALL.md).
