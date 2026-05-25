# Architecture

High-level overview of how PresupuestoHogar is wired together.

## Big picture

```
                  ┌────────────────────────────────────────┐
                  │            Browser (React)             │
                  │  React Router · Zustand · TanStack QC  │
                  │  shadcn/ui · Framer Motion · FullCal.  │
                  │  Chart.js · React Hook Form · Zod      │
                  │  i18next · next-themes · vite PWA      │
                  └─────────┬─────────────────┬────────────┘
                            │ HTTPS           │ WSS
                ┌───────────▼──────┐   ┌──────▼───────────────┐
                │ Netlify CDN +    │   │ Supabase             │
                │ Functions        │   │  PostgreSQL + Auth + │
                │  (esbuild)       │   │  Realtime + Storage  │
                └────────┬─────────┘   │  RLS policies as the │
                         │             │  authoritative gate  │
                         │             └──────────▲───────────┘
                         │ service-role           │
                         ▼                        │
                  ┌────────────┐                  │
                  │  Resend    │                  │
                  │  (emails)  │                  │
                  └────────────┘    Magic Link emails (SMTP)
```

## Layers

### 1. **UI components** (`src/components/`)
- `ui/` — shadcn/ui primitives, generated and customised for our token system
- `kpi/` — KPI cards with semantic tone, trend indicators, animation
- `charts/` — wrappers around Chart.js that share a registration helper
- `calendar/` — FullCalendar wrapper + status palette
- `forms/` — shared inputs (`MoneyInput`, `CategorySelect`, `MemberSelect`)
- `layout/` — `AppShell`, `Sidebar`, `Topbar`, `PageHeader`, `EmptyState`, `FullScreenLoader`

### 2. **Features** (`src/features/<entity>/`)
Each feature is a vertical slice:
```
features/incomes/
├── components/      # Forms, dialogs specific to the feature
├── hooks/           # TanStack Query hooks
├── pages/           # Route pages
├── services/        # Supabase client calls (typed)
└── stores/          # Zustand stores when needed
```

### 3. **Pure libraries** (`src/lib/`)
Pure TypeScript with no React or Supabase dependencies — unit-tested by Vitest:
- `finance/calculations.ts` — the seven canonical formulas (savings minimum, deficit, balance…)
- `finance/projections.ts` — month-end projection
- `finance/envelopes.ts` — zero-sum budgeting helpers
- `finance/splits.ts` — equal/percentage/income-based/custom splits with cent-perfect rounding
- `finance/recurrence.ts` — daily/weekly/biweekly/monthly/quarterly/yearly engine + goal target
- `date.ts` — typed wrappers around date-fns
- `format.ts` — locale-aware currency, percent, dates

### 4. **Supabase layer** (`src/lib/supabase/`)
- `client.ts` — singleton Supabase JS client. `detectSessionInUrl: true` so Magic Link auto-consumes the URL hash. PKCE flow.
- `database.types.ts` — hand-written types (regenerable with `supabase gen types`).

### 5. **Server-side functions** (`netlify/functions/`)
Only the things that **must not** run client-side go here:
- `invite-member` — service role + JWT sign + email via Resend
- `accept-invite` — JWT verify + promote membership row
- `send-reminders` — scheduled daily 08:00 UTC
- `materialize-recurring` — scheduled daily 01:00 UTC
- `monthly-rollover` — scheduled 1st of month 00:30 UTC

Helpers in `_lib/`:
- `supabase-admin.ts` — service-role client + Authorization-Bearer validator
- `invite-token.ts` — HMAC SHA256 sign/verify (no JWT lib needed)
- `email.ts` — Resend SDK + HTML/text templates
- `http.ts` — JSON Response helpers

### 6. **Database** (`supabase/migrations/`)
Six versioned SQL migrations, ordered:
1. `0001_init.sql` — profiles, households, household_members, audit_logs + RLS helper functions
2. `0002_rls_policies.sql` — granular policies per table / per role
3. `0003_core_tables.sql` — categories, incomes, expenses, expense_splits, contributions, payment_statuses + RLS
4. `0004_seed_categories.sql` — trigger that auto-seeds 14 default categories per new household
5. `0005_calendar_events.sql` — calendar_events + Realtime publication
6. `0006_recurring_goals_notifications.sql` — recurring_rules, savings_goals, notifications

## Data flow examples

### Creating an expense (write path)

```
ExpenseFormDialog
  └─ useForm(RHF) + zodResolver(expenseSchema)
       └─ onSubmit → useCreateExpense(householdId).mutate
            └─ createExpense() in expenses.service.ts
                 ├─ supabase.from('expenses').insert(...)  ← RLS gated
                 └─ supabase.from('expense_splits').insert(...)
                      ← rollback parent on failure
            └─ onSuccess: queryClient.invalidateQueries
                 ├─ ['expenses', householdId]
                 └─ ['kpis', householdId]   ← Dashboard auto-refreshes
```

### Dashboard KPI aggregation (read path)

```
DashboardPage
  └─ useHouseholdKpis(householdId)
       └─ fetchHouseholdKpis() in kpis.service.ts
            └─ Promise.all([
                 incomesMonth, expensesMonth, contributionsMonth,
                 categoriesAll, incomesTrend, expensesTrend,
                 overdueExpenses, upcomingExpenses,
               ])  ← 8 parallel queries, all RLS-gated
            └─ Local aggregations:
                 - calculateBreakdown()        (pure)
                 - buildByCategory()           (pure)
                 - aggregateByMember()         (pure)
                 - buildMonthlyTrend()         (pure)
                 - projectMonth()              (pure)
```

### Calendar drag&drop (mutation + realtime)

```
User drags an event
  └─ FullCalendar fires eventChange
       └─ useUpdateCalendarEvent.mutate(id, patch)
            ├─ onMutate: optimistic update of the local query data
            ├─ → supabase.from('calendar_events').update(...)
            ├─ onError: rollback to snapshot
            └─ onSettled: invalidate ['calendar', ...] + ['kpis', ...]

Meanwhile:
  Postgres notifies via Realtime
       └─ useRealtimeCalendarSync (subscription)
            └─ invalidate same queries in *other* connected members' tabs
```

## Authorisation model

Two layers, both required:

### Layer 1 — Postgres Row Level Security
This is the **only authoritative gate**. Every table has policies that:
- Allow `SELECT` for active members of the household
- Allow `INSERT`/`UPDATE` for roles `admin`/`familiar`/`inquilino`
- Restrict `DELETE` to admins (or row creators for some tables)
- Block `invitado` from any write

Implemented via SECURITY DEFINER helper functions (`is_member_of`, `is_writable_member`, `is_household_admin`) to avoid policy recursion.

### Layer 2 — Client UX
`usePermissions()` reads the user's role from Zustand and exposes flags. This:
- Hides buttons that wouldn't work
- Disables form inputs
- Shows informative tooltips

Never trusted alone. If the client is bypassed, RLS still blocks the operation.

## State management

| Tool | What it stores |
|---|---|
| **Zustand `auth.store`** | Current auth user + initialising flag |
| **Zustand `household.store`** | Active household + membership + all households list. Persisted to localStorage (only active selection). |
| **Zustand `ui.store`** | Sidebar collapsed flag. Persisted. |
| **Zustand `calendar.store`** | Calendar view (month/week/day/list), filters, current date. |
| **TanStack Query** | All server data with cache keys like `[entity, householdId, filters]`. |
| **React Hook Form** | All forms — controlled inputs through `<FormField>` wrappers. |

## Testing strategy

- **Unit (Vitest + happy-dom)** — `tests/unit/`:
  - `calculations.test.ts` — the 7 financial formulas + compliance
  - `splits.test.ts` — the 4 split methods + edge cases
  - `envelopes.test.ts` — zero-sum + rollover + status classification
  - `recurrence.test.ts` — frequency engine + monthly goal target
- **E2E (Playwright)** — `tests/e2e/`:
  - `auth.spec.ts` — login page rendering, validation, protected redirect
  - `navigation.spec.ts` — 404 page, check-email guard

Pure financial logic is what *must* be correct — we put 100 % of our test coverage there.

## Performance notes

- **Code splitting**: every route is `React.lazy()` loaded.
- **Manual chunks** in `vite.config.ts`: `react-vendor`, `chart-vendor`, `calendar-vendor`, `supabase-vendor` so the heaviest dependencies are cacheable independently.
- **Service worker** (vite-plugin-pwa) with NetworkFirst for Supabase API + CacheFirst for static assets.
- **Realtime** is bounded: only `calendar_events` per household is subscribed to (cheap).

## Future hooks

The schema and codebase reserve space for:
- **CSV import** (Actual-inspired) — `external_id` deduplication ready
- **Bank sync** — placeholder hooks, no integration yet
- **Multi-currency exchange rates** — schema allows per-row currency
- **Audit log replay** — every mutation already targets `audit_logs` via service-role triggers (to be added in a future migration)
