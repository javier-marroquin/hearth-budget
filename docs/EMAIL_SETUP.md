# Email setup (Resend)

PresupuestoHogar uses [Resend](https://resend.com) for **two** independent things:

1. **Supabase Auth Magic Link emails** (login). Configured at the SMTP level in your Supabase project. See [`AUTH_SETUP.md`](./AUTH_SETUP.md).
2. **Transactional emails from Netlify Functions** (invitations, payment reminders). Uses the Resend REST API.

Both share the same Resend account and API key.

## 1. Create the account

1. Sign up at <https://resend.com>.
2. Verify your email.

## 2. Verify a sending domain (production)

For production you need to verify your own domain (e.g. `presupuesto.tudominio.com`). Steps:

1. Resend dashboard → **Domains** → **Add domain**.
2. Add the DNS records they show (TXT for SPF + 3 CNAME records for DKIM).
3. Wait for verification (usually < 10 minutes).
4. Once verified, use `no-reply@yourdomain.com` as the `RESEND_FROM_EMAIL`.

For development you can skip this step and use `onboarding@resend.dev` as the sender — but Resend only allows sending to **your own verified email** in that mode.

## 3. Create an API key

Resend dashboard → **API Keys** → **Create API key**.

- Name: `PresupuestoHogar production` (or `dev`)
- Permission: **Sending access** (full)
- Domain: select the verified one (or "All domains" if using sandbox)

Copy the key (`re_...`). It's shown only once.

## 4. Env variables

Add to your `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=PresupuestoHogar <no-reply@yourdomain.com>
INVITE_JWT_SECRET=replace-with-openssl-rand-base64-48-output
INVITE_JWT_EXPIRES_IN=7d
APP_URL=http://localhost:5173
```

Generate a strong JWT secret:

```bash
openssl rand -base64 48
```

In Netlify (production), set the same variables in **Site settings → Environment variables**. Make sure they are **not** prefixed with `VITE_` so they stay server-side.

## 5. Configure as Supabase Auth SMTP

This is the critical step for Magic Link to scale. See [`AUTH_SETUP.md`](./AUTH_SETUP.md) section 4.

## 6. Test the integration

After deploying, you can manually trigger the invite Function:

```bash
curl -X POST https://YOUR-SITE.netlify.app/api/invite-member \
  -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"household_id":"...","email":"test@example.com","role":"familiar"}'
```

You should see the invitee receive an email within ~10 seconds.

## Scheduled Functions

The app has scheduled jobs declared via `@netlify/functions` `config.schedule`:

| Function | Cron | What it does |
|---|---|---|
| `send-reminders` | `0 8 * * *` (daily 08:00 UTC) | Emails admins about upcoming/overdue payments, creates in-app notifications |
| `materialize-recurring` | `0 1 * * *` (daily 01:00 UTC) | Generates upcoming `calendar_events` from `recurring_rules` (60-day horizon) |
| `monthly-rollover` | `30 0 1 * *` (1st of month 00:30 UTC) | Marks pending past-due expenses + contributions as `overdue` |

These run automatically on Netlify once deployed. Verify in **Site settings → Functions** that they appear with a 🕒 icon.

## Limits to know

| Free tier | Limit |
|---|---|
| Resend | 3,000 emails / month, 100 / day |
| Netlify Functions | 125,000 invocations / month, 100 hr compute |
| Netlify Scheduled | Run frequency: down to every minute |

For a single household using the app, you'll be well within all limits indefinitely.
