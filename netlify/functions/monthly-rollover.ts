/**
 * Scheduled function: monthly rollover.
 *
 * Runs on the 1st of each month at 00:30. Tasks:
 *   1. Mark pending expenses with due_date < today as `overdue`
 *   2. Same for contributions
 *
 * (Future) snapshot KPIs to a monthly_snapshots table for historic reporting.
 */

import type { Config } from '@netlify/functions';
import { getSupabaseAdmin } from './_lib/supabase-admin';
import { json, serverError } from './_lib/http';

export const config: Config = {
  schedule: '30 0 1 * *',
};

export default async () => {
  try {
    const admin = getSupabaseAdmin();
    const todayIso = new Date().toISOString().slice(0, 10);

    const { data: overdueExpenses, error: e1 } = await admin
      .from('expenses')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('due_date', todayIso)
      .select('id');

    const { data: overdueContrib, error: e2 } = await admin
      .from('contributions')
      .update({ status: 'overdue' })
      .eq('status', 'pending')
      .lt('expected_date', todayIso)
      .select('id');

    if (e1) console.error('[rollover] expenses', e1);
    if (e2) console.error('[rollover] contributions', e2);

    return json({
      ok: true,
      expensesMarkedOverdue: overdueExpenses?.length ?? 0,
      contributionsMarkedOverdue: overdueContrib?.length ?? 0,
    });
  } catch (err) {
    console.error('[rollover] fatal', err);
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
};
