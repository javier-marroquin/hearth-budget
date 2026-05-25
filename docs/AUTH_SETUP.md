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

## 4. Configure Resend as SMTP in Supabase (REQUIRED)

In Supabase: **Project Settings → Authentication → SMTP Settings**.

| Field | Value |
|---|---|
| Enable Custom SMTP | ✅ ON |
| Sender email | `no-reply@yourdomain.com` (or `onboarding@resend.dev`) |
| Sender name | `PresupuestoHogar` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | your **Resend API key** (starts with `re_…`) |
| Minimum interval between emails | `5` seconds |

Save and click **Send test email** to verify.

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

| Symptom | Fix |
|---|---|
| Email doesn't arrive | Check Spam folder. Verify SMTP credentials. Send test from Supabase dashboard. |
| "Email rate limit exceeded" | You hit Supabase's default 4/hour. Set up custom SMTP (Resend) immediately. |
| Link goes to `localhost:5173` in production | Update **Site URL** and **Redirect URLs** in Supabase Auth settings. |
| `Invalid Refresh Token: Refresh Token Not Found` after login | Clear localStorage; bug fixed in recent Supabase JS — make sure you're on `@supabase/supabase-js >= 2.45`. |
| Resend says "domain not verified" | For development use `onboarding@resend.dev`; for prod, add DNS records. |
