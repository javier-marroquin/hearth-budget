# Email setup

Household Budget sends **optional** transactional email for member invitations. Auth uses **email + password** (no magic links).

## Development (default)

With Docker dev profile, **Mailpit** catches all outbound mail:

```bash
docker compose --profile dev up -d db mailpit
```

| Service | URL |
|---------|-----|
| Mailpit UI | http://localhost:8025 |
| SMTP | `localhost:1025` |

In `.env`:

```env
SMTP_HOST=localhost
SMTP_PORT=1025
```

If SMTP is not configured, invite links are **printed to the API console**:

```
[invite] user@example.com → http://localhost:5173/invite?token=...
```

## Production options

### Option A — SMTP (any provider)

Set on the API container / process:

```env
SMTP_HOST=smtp.yourprovider.com
SMTP_PORT=587
# Extend server mail transport if your provider needs USER/PASS/TLS
```

The Hono server reads `SMTP_HOST` and `SMTP_PORT` from [server/src/config.ts](../server/src/config.ts). Wire credentials in your deployment if you add STARTTLS auth.

### Option B — Resend (recommended for small deployments)

1. Create an account at [resend.com](https://resend.com)
2. Verify your sending domain (SPF + DKIM DNS records)
3. Create an API key with **Sending access**
4. Add env vars to the **API** (never prefix with `VITE_`):

```env
# When Resend support is wired in the server:
RESEND_API_KEY=re_xxxxxxxx
RESEND_FROM_EMAIL=Household Budget <no-reply@yourdomain.com>
APP_URL=https://budget.example.com
```

Invite tokens are signed with `AUTH_SECRET` (or optional `INVITE_JWT_SECRET`).

## Testing an invite

1. Sign in as a household **admin**
2. **Members → Invite** (or API):

```bash
curl -b cookies.txt -X POST http://localhost:3000/api/invite-member \
  -H 'Content-Type: application/json' \
  -d '{"household_id":"UUID","email":"friend@example.com","role":"familiar"}'
```

3. Open the invite URL (email or API log) while signed in as the invitee (or sign up with that email)

## Scheduled emails (reminders)

Payment reminder emails are **not yet** implemented in the self-hosted API. Use the **Notifications** page until a cron endpoint ships.

## Limits (Resend free tier)

| | Limit |
|---|------|
| Resend | 3,000 emails/month, 100/day |

A single household stays well within free tiers.
