# Supabase setup

This app uses Supabase as Postgres + Auth + Realtime. Follow these steps to wire up your own project.

## 1. Create the project

1. Sign up at <https://app.supabase.com>.
2. **New project** → pick a name (e.g. `household-budget`), choose a strong DB password and a region close to your users.
3. Wait for provisioning (~2 min).

## 2. Grab the API keys

Go to **Project Settings → API** and copy:

- `Project URL` → `VITE_SUPABASE_URL` (also `SUPABASE_URL` for Functions)
- `anon public` key → `VITE_SUPABASE_ANON_KEY`
- `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (server-side only, **never** commit this)

Paste them into `.env.local` (copied from `.env.example`).

## 3. Run the migrations

There are two options:

### Option A — SQL Editor (fastest)

For each file in `supabase/migrations/` (in order: `0001_init.sql`, `0002_rls_policies.sql`, etc.):

1. Open **SQL Editor** in the Supabase dashboard.
2. Paste the file contents.
3. Click **Run**.

### Option B — Supabase CLI (recommended for ongoing dev)

```bash
# Install once
npm i -g supabase

# Link to your project (one-time)
supabase login
supabase link --project-ref <YOUR-PROJECT-REF>

# Apply migrations
supabase db push
```

You can also run a fully local Supabase (Docker required) with `supabase start` and `supabase db reset` for development.

## 4. Verify the schema

After the migrations succeed, run all files through `0008_recurring_templates.sql` (fixed recurring income/expense templates).

In **Table Editor** you should see:

- `profiles`
- `households`
- `household_members`
- `audit_logs`

And in **Authentication → Policies**, each table should have multiple RLS policies enabled (4-6 per table).

## 5. Configure Auth (see AUTH_SETUP.md)

Magic Link configuration and Resend SMTP custom integration is documented in [`AUTH_SETUP.md`](./AUTH_SETUP.md). **You must do this before any login attempt** or you'll hit Supabase's 4 emails/hour rate limit.

## 6. Generate types (optional but recommended)

Once the schema is live, regenerate the TypeScript types so the client stays in sync:

```bash
npm run supabase:types
# or
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

## Troubleshooting

| Symptom | Fix |
|---|---|
| `relation "public.profiles" does not exist` | Run `0001_init.sql` first |
| `permission denied for table` | RLS is enabled but no matching policy. Re-run `0002_rls_policies.sql` |
| `JWT expired` after login | Increase JWT expiry in Authentication → Settings, or just sign in again |
| Magic link email never arrives | Configure Resend SMTP (see AUTH_SETUP.md) |
| `function uuid_generate_v4() does not exist` on `db push` | Migrations use `gen_random_uuid()` from `pgcrypto`; pull latest and run `supabase db push` again |
