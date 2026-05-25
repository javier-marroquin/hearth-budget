# Deploy to Netlify

This guide walks you through the production deployment, end to end.

## Prerequisites

- A working local build (`npm run build` succeeds)
- A Supabase project with migrations applied (see [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md))
- Magic Link configured (see [`AUTH_SETUP.md`](./AUTH_SETUP.md))
- A Resend account + API key (see [`EMAIL_SETUP.md`](./EMAIL_SETUP.md))
- A GitHub (or GitLab / Bitbucket) repo with this codebase pushed

## 1. Connect the repo to Netlify

1. Sign up / log in at <https://app.netlify.com>.
2. **Add new site → Import from Git → GitHub** → authorize and select the repo.
3. Build settings: Netlify auto-detects `netlify.toml`. Confirm:
   - **Base directory**: (leave empty)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Functions directory**: `netlify/functions`
4. Click **Deploy site** — the first build will fail because env vars are not set yet. That's expected.

## 2. Set environment variables

Go to **Site settings → Environment variables → Add variable**. Add **all** the following (none should be prefixed with `VITE_` except where indicated):

| Variable | Scope | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | Builds | From Supabase Project settings → API |
| `VITE_SUPABASE_ANON_KEY` | Builds | Same place |
| `VITE_APP_NAME` | Builds | e.g. `PresupuestoHogar` |
| `VITE_APP_URL` | Builds | Your prod URL, e.g. `https://presupuesto.netlify.app` |
| `VITE_DEFAULT_LOCALE` | Builds | `es` or `en` |
| `VITE_DEFAULT_CURRENCY` | Builds | `COP`, `USD`, etc. |
| `SUPABASE_URL` | Functions | Same as `VITE_SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions | **SECRET** — from Supabase API page |
| `RESEND_API_KEY` | Functions | **SECRET** — from Resend |
| `RESEND_FROM_EMAIL` | Functions | e.g. `PresupuestoHogar <no-reply@yourdomain.com>` |
| `INVITE_JWT_SECRET` | Functions | **SECRET** — `openssl rand -base64 48` |
| `INVITE_JWT_EXPIRES_IN` | Functions | e.g. `7d` |
| `APP_URL` | Functions | Same as `VITE_APP_URL` |

Set the scope correctly — variables marked **Builds** are exposed to the bundle; **Functions** stay server-side.

## 3. Trigger a rebuild

**Deploys → Trigger deploy → Deploy site**. Watch the build log; you should see Vite finish and the Functions get bundled by esbuild.

## 4. Update Supabase redirect URLs

After your site is live at e.g. `https://YOURSITE.netlify.app`:

Supabase → **Authentication → URL Configuration**:

- **Site URL**: `https://YOURSITE.netlify.app`
- **Redirect URLs** (add):
  - `https://YOURSITE.netlify.app/auth/callback`
  - Also keep your local `http://localhost:5173/auth/callback`

Without this, the Magic Link redirects to the wrong URL after clicking.

## 5. Optional: custom domain

Netlify → **Domain management → Add custom domain**. Netlify will provision a free Let's Encrypt SSL cert.

Then update:

- `VITE_APP_URL` and `APP_URL` to the new domain
- Supabase Site URL + Redirect URLs to include the new domain
- Resend "From" domain to match

## 6. Verify scheduled functions

Functions with `export const config = { schedule: ... }` register themselves automatically. Verify in:

**Site → Functions → (function name)** → top right shows a 🕒 icon if scheduled.

Manual trigger for testing:

```bash
curl https://YOURSITE.netlify.app/.netlify/functions/send-reminders
```

(This will run the function once on demand.)

## 7. Smoke test

1. Open `https://YOURSITE.netlify.app`
2. Click **Send magic link** → enter your email
3. Open the email → click the link → land on `/onboarding`
4. Create a household
5. Try the dashboard, add a few expenses
6. Invite another email (use a second address you control)
7. Check the inbox → click the invite link → confirm they land in the same household

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails: `Cannot find module '@supabase/supabase-js'` | Make sure `npm install` ran. Try clearing Netlify build cache. |
| `VITE_SUPABASE_URL is undefined` at runtime | Variable name typo, or scope set to Functions instead of Builds |
| Magic Link email never arrives in prod | Check Resend dashboard → Logs. Verify SMTP custom is configured in Supabase Auth |
| `Invalid Redirect URL` on login | Add your prod URL to Supabase Auth → URL configuration |
| Functions 500 error | Check Site → Functions → Logs. Most often a missing env var. |
| `INVITE_JWT_SECRET must be at least 16 characters` | Regenerate with `openssl rand -base64 48` and set in Netlify env |
| Scheduled functions not running | Confirm the schedule expression is valid cron + that the function file exports `config` |

## Going further

- **Branch deploys**: every PR gets a preview URL. Add the preview URL to Supabase redirect URLs (with wildcard `https://deploy-preview-*--YOURSITE.netlify.app/auth/callback`) so OAuth works on previews too.
- **Build hooks**: trigger a rebuild from GitHub Actions or curl.
- **Analytics**: Netlify Analytics ($9/mo) or wire a privacy-friendly alternative (Plausible).
