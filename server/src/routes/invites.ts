import { Hono } from 'hono';
import { z } from 'zod';
import { config } from '../config.js';
import type { AppVariables } from '../middleware/session.js';
import { signInvite, verifyInvite } from '../lib/invite-token.js';
import { sendHouseholdInviteEmail } from '../services/email.service.js';
import { parseJson, unauthorized, withAuth, withHouseholdAdmin } from './helpers.js';

const inviteBody = z.object({
  household_id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  role: z.enum(['admin', 'familiar', 'inquilino', 'invitado']),
});

const acceptBody = z.object({ token: z.string().min(10) });

export const invitesRoutes = new Hono<{ Variables: AppVariables }>();

invitesRoutes.post('/invite-member', async (c) => {
  const parsed = inviteBody.safeParse(await parseJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;

  const result = await withHouseholdAdmin(c, body.household_id, async (client, callerId) => {
    const { rows: householdRows } = await client.query(
      `SELECT name FROM public.households WHERE id = $1`,
      [body.household_id],
    );
    const { rows: profileRows } = await client.query(
      `SELECT full_name, email FROM public.profiles WHERE id = $1`,
      [callerId],
    );

    const { rows: inserted } = await client.query(
      `INSERT INTO public.household_members
         (household_id, user_id, role, status, invited_email, invited_at)
       VALUES ($1, NULL, $2, 'invited', $3, now())
       RETURNING *`,
      [body.household_id, body.role, body.email],
    );
    const row = inserted[0];
    if (!row) throw new Error('Failed to create invitation');

    const token = signInvite({
      hid: body.household_id,
      mid: row.id as string,
      email: body.email,
    });

    const appUrl = config.APP_URL.replace(/\/$/, '');
    const inviteUrl = `${appUrl}/invite?token=${encodeURIComponent(token)}`;

    const inviterName =
      (profileRows[0]?.full_name as string | undefined) ??
      (profileRows[0]?.email as string | undefined) ??
      'A household admin';
    const householdName = (householdRows[0]?.name as string | undefined) ?? 'your household';

    let emailMode: 'resend' | 'smtp' | 'console' = 'console';
    let emailSent = false;
    try {
      emailMode = await sendHouseholdInviteEmail({
        to: body.email,
        inviteUrl,
        householdName,
        inviterName,
      });
      emailSent = emailMode !== 'console';
    } catch (err) {
      console.error('[invite] email failed', err);
      console.log(`[invite] ${body.email} → ${inviteUrl}`);
    }

    if (!emailSent) {
      console.log(`[invite] ${body.email} → ${inviteUrl}`);
    }

    return {
      ok: true,
      membership_id: row.id,
      invite_url: inviteUrl,
      email_sent: emailSent,
      email_mode: emailMode,
      inviter: inviterName,
      household_name: householdName,
    };
  });

  if (result instanceof Response) return result;
  return c.json(result);
});

invitesRoutes.post('/accept-invite', async (c) => {
  const user = c.get('user');
  if (!user) return unauthorized(c);

  const parsed = acceptBody.safeParse(await parseJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  let payload;
  try {
    payload = verifyInvite(parsed.data.token);
  } catch (err) {
    return c.json(
      { error: err instanceof Error ? err.message : 'Invalid token' },
      403,
    );
  }

  if (payload.email.toLowerCase() !== user.email.toLowerCase()) {
    return c.json(
      {
        error: `This invite was sent to ${payload.email}, but you're signed in as ${user.email}`,
      },
      403,
    );
  }

  const result = await withAuth(c, async (client) => {
    try {
      const { rows: pendingRows } = await client.query(
        `SELECT * FROM public.household_members
         WHERE id = $1 AND household_id = $2`,
        [payload.mid, payload.hid],
      );
      const pending = pendingRows[0];
      if (!pending) throw new Error('Invitation not found');
      if (pending.status === 'active') {
        const { rows: householdRows } = await client.query(
          `SELECT name FROM public.households WHERE id = $1`,
          [payload.hid],
        );
        return {
          ok: true,
          household_id: payload.hid,
          household_name: householdRows[0]?.name ?? null,
        };
      }
      if (pending.status !== 'invited') {
        throw new Error('Invitation is no longer valid');
      }

      await client.query(
        `UPDATE public.household_members
         SET user_id = $1, status = 'active', joined_at = now()
         WHERE id = $2`,
        [user.id, pending.id],
      );

      const { rows: householdRows } = await client.query(
        `SELECT name FROM public.households WHERE id = $1`,
        [payload.hid],
      );

      return {
        ok: true,
        household_id: payload.hid,
        household_name: householdRows[0]?.name ?? null,
      };
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : 'Failed' },
        403,
      );
    }
  });

  if (result instanceof Response) return result;
  return c.json(result);
});
