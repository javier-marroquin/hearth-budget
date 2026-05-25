/**
 * Scheduled function: materialize recurring calendar events.
 *
 * Runs nightly. For each `recurring_rules` row, generates the next 60 days of
 * `calendar_events` (idempotent: skips dates that already have an event
 * linked to the same rule).
 */

import type { Config } from '@netlify/functions';
import { getSupabaseAdmin } from './_lib/supabase-admin';
import { nextOccurrences, type RecurrenceRule } from '../../src/lib/finance/recurrence';
import { json, serverError } from './_lib/http';

export const config: Config = {
  schedule: '0 1 * * *',
};

export default async () => {
  try {
    const admin = getSupabaseAdmin();
    const { data: rules, error } = await admin.from('recurring_rules').select('*');
    if (error || !rules) return serverError(error?.message ?? 'No rules');

    const horizonDays = 60;
    let created = 0;

    for (const rule of rules) {
      const occurrences = nextOccurrences(rule as RecurrenceRule, horizonDays);
      if (occurrences.length === 0) continue;

      // Find which ones we've already created for this rule.
      const { data: existing } = await admin
        .from('calendar_events')
        .select('start_at')
        .eq('household_id', rule.household_id)
        .eq('recurring_rule_id', rule.id);

      const existingDates = new Set(
        (existing ?? []).map((e) => e.start_at.slice(0, 10)),
      );

      const toInsert = occurrences
        .filter((d) => !existingDates.has(d.toISOString().slice(0, 10)))
        .map((d) => ({
          household_id: rule.household_id,
          title: `Recurrencia: ${rule.frequency}`,
          event_type: 'reminder' as const,
          start_at: d.toISOString(),
          all_day: true,
          status: 'recurring' as const,
          recurring_rule_id: rule.id,
        }));

      if (toInsert.length === 0) continue;
      const { error: insErr } = await admin.from('calendar_events').insert(toInsert);
      if (insErr) {
        console.error('[recurring] insert failed', insErr);
        continue;
      }
      created += toInsert.length;
    }

    return json({ ok: true, rulesProcessed: rules.length, eventsCreated: created });
  } catch (err) {
    console.error('[recurring] fatal', err);
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
};
