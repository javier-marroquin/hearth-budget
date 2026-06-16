import { apiFetch } from '@/lib/api/client';

export interface EmailStatus {
  mode: 'resend' | 'smtp' | 'console';
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

export async function fetchEmailStatus(): Promise<EmailStatus> {
  return apiFetch('/api/email/status');
}

export async function sendTestEmail(to?: string): Promise<{ ok: boolean; mode: string; to: string }> {
  return apiFetch('/api/email/test', {
    method: 'POST',
    body: JSON.stringify(to ? { to } : {}),
  });
}
