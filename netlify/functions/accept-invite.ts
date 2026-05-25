/**
 * POST /api/accept-invite
 *
 * Body: { token: string }
 *
 * Validates the signed invite token, looks up the pending membership row,
 * verifies the invited_email matches the caller's email, and promotes it
 * to active with user_id set.
 */

import { z } from 'zod';
import { getCallerFromAuth, getSupabaseAdmin } from './_lib/supabase-admin';
import { verifyInvite } from './_lib/invite-token';
import { badRequest, forbidden, json, readJson, serverError, unauthorized } from './_lib/http';

const InputSchema = z.object({ token: z.string().min(10) });

export default async (req: Request) => {
  if (req.method !== 'POST') return badRequest('Use POST');
  try {
    const caller = await getCallerFromAuth(req.headers.get('authorization'));
    const body = InputSchema.parse(await readJson(req));

    let payload;
    try {
      payload = verifyInvite(body.token);
    } catch (err) {
      return forbidden(err instanceof Error ? err.message : 'Invalid token');
    }

    if (payload.email.toLowerCase() !== caller.email.toLowerCase()) {
      return forbidden(
        `This invite was sent to ${payload.email}, but you're signed in as ${caller.email}`,
      );
    }

    const admin = getSupabaseAdmin();

    // Look up the pending row.
    const { data: pending, error: pErr } = await admin
      .from('household_members')
      .select('*')
      .eq('id', payload.mid)
      .eq('household_id', payload.hid)
      .single();
    if (pErr || !pending) return forbidden('Invitation not found');
    if (pending.status === 'active') return json({ ok: true, household_id: payload.hid });
    if (pending.status !== 'invited') return forbidden('Invitation is no longer valid');

    // Promote.
    const { error: uErr } = await admin
      .from('household_members')
      .update({
        user_id: caller.id,
        status: 'active',
        joined_at: new Date().toISOString(),
      })
      .eq('id', pending.id);
    if (uErr) return serverError(uErr.message);

    // Look up household name for the response (so the UI can welcome the user)
    const { data: household } = await admin
      .from('households')
      .select('name')
      .eq('id', payload.hid)
      .single();

    return json({
      ok: true,
      household_id: payload.hid,
      household_name: household?.name ?? null,
    });
  } catch (err) {
    if (err instanceof z.ZodError) return badRequest(err.message);
    if (err instanceof Error && err.message.startsWith('Missing Authorization')) {
      return unauthorized(err.message);
    }
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
};
