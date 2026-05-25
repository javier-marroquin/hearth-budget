/**
 * POST /api/invite-member
 *
 * Body: { household_id: string, email: string, role: HouseholdRole }
 *
 * Creates an invited household_members row + a signed JWT token + emails it
 * to the invitee via Resend.
 *
 * Only admins of the target household can invite (validated against RLS via
 * the caller's JWT).
 */

import { z } from 'zod';
import { getCallerFromAuth, getSupabaseAdmin } from './_lib/supabase-admin';
import { signInvite } from './_lib/invite-token';
import { inviteEmailTemplate, sendEmail } from './_lib/email';
import { badRequest, forbidden, json, readJson, serverError, unauthorized } from './_lib/http';

const InputSchema = z.object({
  household_id: z.string().uuid(),
  email: z.string().email().toLowerCase(),
  role: z.enum(['admin', 'familiar', 'inquilino', 'invitado']),
});

export default async (req: Request) => {
  if (req.method !== 'POST') return badRequest('Use POST');
  try {
    const caller = await getCallerFromAuth(req.headers.get('authorization'));
    const body = InputSchema.parse(await readJson(req));

    const admin = getSupabaseAdmin();

    // Validate caller is admin of this household.
    const { data: callerMembership, error: mErr } = await admin
      .from('household_members')
      .select('role, status')
      .eq('household_id', body.household_id)
      .eq('user_id', caller.id)
      .eq('status', 'active')
      .single();
    if (mErr || !callerMembership || callerMembership.role !== 'admin') {
      return forbidden('Only household admins can invite');
    }

    // Look up the household name + caller profile for the email.
    const { data: household } = await admin
      .from('households')
      .select('name')
      .eq('id', body.household_id)
      .single();
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', caller.id)
      .single();

    // Create the pending membership row. Note: invited rows are NOT linked
    // to a user_id yet — that happens when they sign in and accept.
    const { data: insertedRow, error: insErr } = await admin
      .from('household_members')
      .insert({
        household_id: body.household_id,
        user_id: null,
        role: body.role,
        status: 'invited',
        invited_email: body.email,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (insErr || !insertedRow) {
      return serverError(insErr?.message ?? 'Failed to create invitation');
    }

    const token = signInvite({
      hid: body.household_id,
      mid: insertedRow.id,
      email: body.email,
    });

    const appUrl = (process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '');
    const inviteUrl = `${appUrl}/invite?token=${encodeURIComponent(token)}`;

    const template = inviteEmailTemplate({
      inviterName: profile?.full_name ?? caller.email ?? 'Un miembro',
      householdName: household?.name ?? 'el hogar',
      inviteUrl,
    });

    await sendEmail({ to: body.email, ...template });

    return json({ ok: true, membership_id: insertedRow.id });
  } catch (err) {
    if (err instanceof z.ZodError) return badRequest(err.message);
    if (err instanceof Error && err.message.startsWith('Missing Authorization')) {
      return unauthorized(err.message);
    }
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
};
