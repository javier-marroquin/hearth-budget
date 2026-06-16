import { Hono } from 'hono';
import { z } from 'zod';
import type { AppVariables } from '../middleware/session.js';
import { getEmailStatus, sendEmail } from '../services/email.service.js';
import { parseJson, unauthorized } from './helpers.js';

const testBody = z.object({
  to: z.string().email().optional(),
});

export const emailRoutes = new Hono<{ Variables: AppVariables }>();

emailRoutes.get('/email/status', async (c) => {
  const user = c.get('user');
  if (!user) return unauthorized(c);
  return c.json(getEmailStatus());
});

emailRoutes.post('/email/test', async (c) => {
  const user = c.get('user');
  if (!user) return unauthorized(c);

  const parsed = testBody.safeParse(await parseJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const to = parsed.data.to ?? user.email;
  if (to.toLowerCase() !== user.email.toLowerCase()) {
    return c.json({ error: 'Test emails can only be sent to your own address' }, 403);
  }

  const status = getEmailStatus();
  if (!status.supportsInvites) {
    return c.json(
      {
        error:
          'Outbound email is not configured. Set SMTP_* or RESEND_* variables in the server .env file.',
      },
      503,
    );
  }

  try {
    const mode = await sendEmail({
      to,
      subject: 'Open Hearth Budget — test email',
      text: 'If you received this message, outbound email is working.',
      html: '<p>If you received this message, <strong>outbound email is working</strong>.</p>',
    });
    return c.json({ ok: true, mode, to });
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Failed to send test email' },
      502,
    );
  }
});
