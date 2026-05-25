import { Resend } from 'resend';

let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  _resend = new Resend(key);
  return _resend;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ id: string }> {
  const from =
    process.env.RESEND_FROM_EMAIL ?? 'PresupuestoHogar <onboarding@resend.dev>';
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
  if (error) throw new Error(error.message ?? 'Resend error');
  if (!data?.id) throw new Error('Resend did not return an id');
  return { id: data.id };
}

export function inviteEmailTemplate(opts: {
  inviterName: string;
  householdName: string;
  inviteUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `Te invitaron a ${opts.householdName} en PresupuestoHogar`;
  const html = /* html */ `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color:#0f172a">
  <div style="max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2 style="color:#0f172a">Hola 👋</h2>
    <p>${escapeHtml(opts.inviterName)} te invitó a unirte al hogar <strong>${escapeHtml(opts.householdName)}</strong>.</p>
    <p style="margin: 32px 0;">
      <a href="${opts.inviteUrl}"
         style="background:#10b981; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
        Aceptar invitación
      </a>
    </p>
    <p style="color:#475569; font-size:14px">Este enlace expira en 7 días.</p>
    <p style="color:#94a3b8; font-size:12px; margin-top:32px">
      Si no esperabas este correo, ignóralo. PresupuestoHogar — presupuesto colaborativo de hogares.
    </p>
  </div>
</body></html>`;
  const text = `${opts.inviterName} te invitó a unirte al hogar ${opts.householdName}.

Acepta la invitación: ${opts.inviteUrl}

Este enlace expira en 7 días.`;
  return { subject, html, text };
}

export function reminderEmailTemplate(opts: {
  recipientName: string;
  householdName: string;
  upcoming: number;
  overdue: number;
  dashboardUrl: string;
}): { subject: string; html: string; text: string } {
  const subject =
    opts.overdue > 0
      ? `⚠️ ${opts.overdue} pago(s) vencido(s) en ${opts.householdName}`
      : `${opts.upcoming} pago(s) próximo(s) en ${opts.householdName}`;
  const html = /* html */ `
<!DOCTYPE html>
<html><body style="font-family: system-ui, sans-serif; line-height: 1.5; color:#0f172a">
  <div style="max-width: 480px; margin: 0 auto; padding: 24px;">
    <h2>Hola ${escapeHtml(opts.recipientName)} 👋</h2>
    <p>Resumen de pagos del hogar <strong>${escapeHtml(opts.householdName)}</strong>:</p>
    <ul>
      ${opts.overdue > 0 ? `<li style="color:#dc2626"><strong>${opts.overdue} pago(s) vencido(s)</strong></li>` : ''}
      ${opts.upcoming > 0 ? `<li style="color:#d97706">${opts.upcoming} pago(s) próximo(s) (7 días)</li>` : ''}
    </ul>
    <p style="margin: 32px 0;">
      <a href="${opts.dashboardUrl}"
         style="background:#0ea5e9; color:#fff; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600;">
        Ver el dashboard
      </a>
    </p>
    <p style="color:#94a3b8; font-size:12px; margin-top:32px">PresupuestoHogar</p>
  </div>
</body></html>`;
  const text = `Hola ${opts.recipientName},

Hogar ${opts.householdName}:
${opts.overdue > 0 ? `- ${opts.overdue} pago(s) vencido(s)\n` : ''}${opts.upcoming > 0 ? `- ${opts.upcoming} pago(s) próximo(s) (7 días)\n` : ''}
Abre el dashboard: ${opts.dashboardUrl}`;
  return { subject, html, text };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
