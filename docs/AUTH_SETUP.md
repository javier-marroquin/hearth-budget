# Auth setup — Magic Link with Resend SMTP

This app uses **passwordless** authentication via Supabase Auth's Magic Link (OTP email). No passwords, no third-party OAuth providers.

> ⚠ **Critical**: Supabase's default SMTP is rate-limited to **4 emails/hour**. You MUST configure a custom SMTP (Resend) before the first user logs in or you'll get blocked instantly.

## 1. Enable email authentication

In your Supabase dashboard:

1. Go to **Authentication → Providers**.
2. Find **Email** and click to expand.
3. Make sure these are toggled:
   - ✅ **Enable Email provider** → ON
   - ✅ **Enable Email Confirmations** → can be OFF (Magic Link implicitly verifies)
   - ✅ **Secure email change** → ON (recommended)
4. Save.

## 2. Configure redirect URLs

Authentication → **URL Configuration**:

- **Site URL**: `http://localhost:5173` (development) or your production domain.
- **Redirect URLs**: add both
  - `http://localhost:5173/auth/callback`
  - `https://YOUR-DOMAIN.netlify.app/auth/callback`
  - `https://YOUR-CUSTOM-DOMAIN/auth/callback`

Save.

## 3. Set up Resend (free 3,000 emails/month)

1. Sign up at <https://resend.com>.
2. **Domains** → **Add domain**:
   - For development you can use the sandbox `onboarding@resend.dev` (limited to your own email).
   - For production, add and verify your own domain (DNS records).
3. **API Keys** → **Create API key** → copy the value.

Paste into `.env.local`:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=PresupuestoHogar <no-reply@yourdomain.com>
```

## 4. Configure custom SMTP in Supabase (REQUIRED)

Magic-link emails are sent by **Supabase Auth**, not by this repo. You must enable SMTP in the Supabase dashboard.

**Project Settings → Authentication → SMTP Settings** (or **Authentication → SMTP** in newer dashboards).

### Option A — Your own mailbox (Private Email / Namecheap)

Use only the **outgoing (SMTP)** settings. IMAP (port 993) is for reading mail in an email client; Supabase does not use it.

| Field | Value |
|---|---|
| Enable Custom SMTP | ✅ ON |
| Sender email | `jm@tsa.com.sv` (must match the SMTP account, or an alias you are allowed to send as) |
| Sender name | `PresupuestoHogar` |
| Host | `mail.privateemail.com` |
| Port | **`587` first** (Supabase docs recommend this). If test fails, try `465` + SSL |
| Username | `jm@tsa.com.sv` (full address — same as Sender email) |
| Password | the **mailbox password** for that account (re-type and Save; Supabase can cache a bad password) |
| Encryption | TLS / STARTTLS on 587; SSL on 465 |
| Minimum interval between emails | `5` seconds |

Save → **Send test email**. The test must succeed before `/auth/v1/otp` will work.

**Supabase field names** (wording varies by dashboard version):

| Private Email | Supabase dashboard |
|---|---|
| Your address `jm@tsa.com.sv` | **Sender email** / **SMTP admin email** |
| `jm@tsa.com.sv` | **SMTP user** / **Username** |
| Mailbox password | **SMTP password** |

Sender email and SMTP user must be the **same** mailbox unless you use a verified alias.

> Do **not** put the mailbox password in `.env.local` for magic links — only paste it in Supabase SMTP settings. Never commit email passwords to git.

### Option B — Resend (alternative)

| Field | Value |
|---|---|
| Enable Custom SMTP | ✅ ON |
| Sender email | `no-reply@yourdomain.com` (or `onboarding@resend.dev` for dev) |
| Sender name | `PresupuestoHogar` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your **Resend API key** (starts with `re_…`) |
| Minimum interval between emails | `5` seconds |

Save and click **Send test email** to verify.

### After SMTP works

The built-in **4 emails/hour** limit no longer applies. If you still see `email rate limit exceeded`, wait up to ~1 hour for the counter to reset, then send **one** new magic link.

## 5. Customize email templates (optional but recommended)

Authentication → **Email Templates → Magic Link**:

```html
<h2>Hola 👋</h2>
<p>Haz clic en el enlace para entrar a {{ .SiteURL }}:</p>
<p><a href="{{ .ConfirmationURL }}">Iniciar sesión</a></p>
<p>Si no solicitaste este correo, ignóralo.</p>
<p>— PresupuestoHogar</p>
```

You can localize per-user via the `data.lang` claim if you support multi-language emails.

## 6. Test the flow

1. `npm run dev`
2. Go to <http://localhost:5173/login>.
3. Enter your email and click **Send magic link**.
4. Check your inbox.
5. Click the link → land on `/auth/callback` → redirect to `/onboarding` (first time) or `/dashboard`.

## Troubleshooting

### `POST /auth/v1/otp` → 500 / `unexpected_failure` / "Error sending confirmation email"

That response means **Supabase could not send mail through your SMTP** (not a bug in this repo).

1. Open **Authentication → Logs** (Auth logs, not generic API logs).
2. Click the failed **otp** / **magiclink** row and read the **`error`** field. Common values:
   - `535 Authentication failed` → wrong password, wrong username, or Sender email ≠ SMTP user.
   - `dial tcp … timeout` on port 25/465 → try port **587**.
   - `Error sending confirmation email` with no detail → fix **Send test email** in SMTP settings first.

3. In SMTP settings: toggle **Enable Custom SMTP** OFF → Save → ON → re-enter password → Save → **Send test email**.

4. Confirm the mailbox works in Apple Mail/Outlook with the same host, user, and password.

5. In **Authentication → URL Configuration**, add every dev URL you use:
   - `http://localhost:5173/auth/callback`
   - `http://localhost:8888/auth/callback` (if you open the app on port 8888 — your logs showed `referer: localhost:8888`)
   - Set **Site URL** to the port you actually use.

6. Align `.env.local`: `VITE_APP_URL` must match the browser URL (e.g. `http://localhost:8888` if that is where you run the app).

| Symptom | Fix |
|---|---|
| Email doesn't arrive | Check Spam folder. Verify SMTP credentials. Send test from Supabase dashboard. |
| "Email rate limit exceeded" | Supabase's **built-in** mailer allows ~**4 emails/hour** per project. **Fix:** enable custom SMTP (section 4) and confirm **Send test email** works. `.env.local` / Resend keys do **not** power magic links unless SMTP is set in the Supabase dashboard. After SMTP is on, wait up to ~1 hour if the error persists, then retry once. |
| Link goes to `localhost:5173` in production | Update **Site URL** and **Redirect URLs** in Supabase Auth settings. |
| Magic link opens `localhost` but shows "No pudimos validar el enlace" | **Local dev is OK** — `localhost` is expected. Keep `npm run dev` running on the same machine, open the link on that Mac (not from your phone), and add `http://localhost:5173/auth/callback` to Supabase **Redirect URLs**. Request a **new** magic link after any auth config change. |
| Stuck on "Verificando tu sesión…" | Request a **fresh** magic link (old PKCE links break after switching to implicit flow). Open the email link in a desktop browser with `npm run dev` running. If it still hangs, check the browser console on `/auth/callback`. |
| Want to test login on your phone | Deploy to Netlify first — `localhost` only works on your dev machine. |
| `Invalid Refresh Token: Refresh Token Not Found` after login | Clear localStorage; bug fixed in recent Supabase JS — make sure you're on `@supabase/supabase-js >= 2.45`. |
| Resend says "domain not verified" | For development use `onboarding@resend.dev`; for prod, add DNS records. |
