# PresupuestoHogar

> Aplicativo web profesional de presupuesto colaborativo para hogares.
> Multi-usuario, multi-idioma, PWA-ready, desplegable en Netlify.

Responde una pregunta única: **¿cuánto necesita ganar tu hogar este mes para vivir, comer, pagar obligaciones y ahorrar al menos el 10%?**

---

## Stack

- **Frontend**: React 18 + TypeScript + Vite 5
- **Styling**: Tailwind CSS + shadcn/ui + Framer Motion
- **State**: Zustand (UI) + TanStack Query (server state)
- **Forms**: React Hook Form + Zod
- **Charts**: Chart.js + react-chartjs-2
- **Calendar**: FullCalendar (daygrid + timegrid + list + interaction)
- **Dates**: date-fns + date-fns-tz
- **i18n**: react-i18next (es + en)
- **Theming**: next-themes (light/dark/system)
- **PWA**: vite-plugin-pwa
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Auth**: Supabase Magic Link (passwordless)
- **Functions**: Netlify Functions (TypeScript, esbuild)
- **Email**: Resend (transactional)
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Deploy**: Netlify

---

## Quick start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
# Then fill in the required values (see docs/SUPABASE_SETUP.md)
```

### 3. Run the dev server

```bash
npm run dev
```

Visit <http://localhost:5173>.

---

## Project structure

```
household-budget/
├── netlify/functions/       # Serverless functions (invitations, scheduled jobs)
├── public/                  # Static assets (manifest, icons)
├── src/
│   ├── app/                 # Providers, router, layout shell
│   ├── components/
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── layout/          # AppShell, Sidebar, Topbar
│   │   ├── kpi/             # KPI cards
│   │   ├── charts/          # Chart.js wrappers
│   │   └── calendar/        # FullCalendar wrappers
│   ├── features/            # Feature modules (auth, households, expenses, …)
│   ├── lib/
│   │   ├── supabase/        # Client + generated types
│   │   ├── finance/         # Pure financial calculations (tested)
│   │   ├── date.ts          # date-fns helpers
│   │   └── format.ts        # Currency, percent, locale formatters
│   ├── hooks/queries/       # TanStack Query hooks
│   ├── stores/              # Zustand stores
│   ├── schemas/             # Zod schemas
│   ├── locales/             # es.json, en.json
│   └── styles/globals.css   # Tailwind + CSS variables
├── supabase/migrations/     # Versioned SQL migrations
├── tests/
│   ├── unit/                # Vitest
│   └── e2e/                 # Playwright
└── docs/                    # Setup guides
```

---

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Start Vite dev server on :5173 |
| `npm run build` | Build for production into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm test` | Run Vitest unit tests |
| `npm run test:watch` | Vitest watch mode |
| `npm run e2e` | Run Playwright E2E |
| `npm run typecheck` | TS type checking |

---

## Documentation

- [`docs/SUPABASE_SETUP.md`](./docs/SUPABASE_SETUP.md) — create the Supabase project + run migrations
- [`docs/AUTH_SETUP.md`](./docs/AUTH_SETUP.md) — configure Magic Link + Resend as SMTP
- [`docs/EMAIL_SETUP.md`](./docs/EMAIL_SETUP.md) — Resend for invitations & reminders
- [`docs/DEPLOY_NETLIFY.md`](./docs/DEPLOY_NETLIFY.md) — Netlify deployment guide
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — architecture overview
- [`docs/ENVELOPE_BUDGETING.md`](./docs/ENVELOPE_BUDGETING.md) — envelope mode explained

---

## Roles

| Role | Read | Write expenses | Edit own income | Invite | Delete household |
|---|---|---|---|---|---|
| `admin` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `familiar` | ✓ | ✓ | ✓ | ✗ | ✗ |
| `inquilino` | ✓ | ✓ (own/shared) | ✓ | ✗ | ✗ |
| `invitado` | ✓ | ✗ | ✗ | ✗ | ✗ |

---

## License

MIT. See [LICENSE](./LICENSE).
