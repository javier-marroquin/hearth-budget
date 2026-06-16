import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';

export type EmailMode = 'resend' | 'smtp' | 'console';

export interface EmailStatus {
  mode: EmailMode;
  configured: boolean;
  from: string | null;
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    hasAuth: boolean;
  } | null;
  supportsInvites: boolean;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let smtpTransport: Transporter | null = null;

function resolveMode(): EmailMode {
  if (config.RESEND_API_KEY) return 'resend';
  if (config.SMTP_HOST) return 'smtp';
  return 'console';
}

function resolveFrom(): string | null {
  return config.SMTP_FROM ?? config.RESEND_FROM_EMAIL ?? null;
}

function getSmtpTransport(): Transporter {
  if (!config.SMTP_HOST) {
    throw new Error('SMTP is not configured');
  }
  if (!smtpTransport) {
    smtpTransport = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT ?? 587,
      secure: config.SMTP_SECURE,
      auth:
        config.SMTP_USER && config.SMTP_PASS
          ? { user: config.SMTP_USER, pass: config.SMTP_PASS }
          : undefined,
    });
  }
  return smtpTransport;
}

export function getEmailStatus(): EmailStatus {
  const mode = resolveMode();
  const from = resolveFrom();

  return {
    mode,
    configured: mode !== 'console' && Boolean(from),
    from,
    smtp:
      mode === 'smtp' && config.SMTP_HOST
        ? {
            host: config.SMTP_HOST,
            port: config.SMTP_PORT ?? 587,
            secure: config.SMTP_SECURE,
            hasAuth: Boolean(config.SMTP_USER && config.SMTP_PASS),
          }
        : null,
    supportsInvites: mode === 'console' || Boolean(from),
  };
}

async function sendViaResend(input: SendEmailInput): Promise<void> {
  if (!config.RESEND_API_KEY) throw new Error('Resend is not configured');
  const from = config.RESEND_FROM_EMAIL;
  if (!from) throw new Error('RESEND_FROM_EMAIL is not set');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend error (${res.status}): ${body}`);
  }
}

async function sendViaSmtp(input: SendEmailInput): Promise<void> {
  const from = config.SMTP_FROM;
  if (!from) throw new Error('SMTP_FROM is not set');

  await getSmtpTransport().sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}

export async function sendEmail(input: SendEmailInput): Promise<EmailMode> {
  const mode = resolveMode();

  if (mode === 'resend') {
    await sendViaResend(input);
    return mode;
  }

  if (mode === 'smtp') {
    await sendViaSmtp(input);
    return mode;
  }

  console.log('[email:console]', {
    to: input.to,
    subject: input.subject,
    text: input.text ?? input.html.replace(/<[^>]+>/g, ' ').slice(0, 200),
  });
  return mode;
}

export async function sendHouseholdInviteEmail(input: {
  to: string;
  inviteUrl: string;
  householdName: string;
  inviterName: string;
}): Promise<EmailMode> {
  const subject = `You're invited to ${input.householdName} on Open Hearth Budget`;
  const text = [
    `${input.inviterName} invited you to join "${input.householdName}" on Open Hearth Budget.`,
    '',
    `Accept the invitation: ${input.inviteUrl}`,
    '',
    'This link expires in 7 days.',
  ].join('\n');

  const html = `
    <p><strong>${escapeHtml(input.inviterName)}</strong> invited you to join
    <strong>${escapeHtml(input.householdName)}</strong> on Open Hearth Budget.</p>
    <p><a href="${escapeHtml(input.inviteUrl)}">Accept invitation</a></p>
    <p style="color:#666;font-size:13px">This link expires in 7 days.</p>
  `.trim();

  return sendEmail({ to: input.to, subject, html, text });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
