/**
 * Scheduled function: send daily reminders for upcoming and overdue payments.
 *
 * Runs every morning at 08:00 UTC. For each household, finds:
 *   - pending expenses with due_date < today  → overdue
 *   - pending expenses with due_date in next 7 days → upcoming
 *
 * Then emails the household admins + creates in-app notifications.
 */

import type { Config } from '@netlify/functions';
import { getSupabaseAdmin } from './_lib/supabase-admin';
import { reminderEmailTemplate, sendEmail } from './_lib/email';
import { json, serverError } from './_lib/http';

export const config: Config = {
  schedule: '0 8 * * *',
};

export default async () => {
  try {
    const admin = getSupabaseAdmin();
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const horizon = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // 1) Pull all active households + their admin members.
    const { data: households, error: hhErr } = await admin
      .from('households')
      .select('id, name');
    if (hhErr || !households) return serverError(hhErr?.message ?? 'No households');

    let processed = 0;
    let emailsSent = 0;
    let notificationsCreated = 0;

    for (const h of households) {
      // Count upcoming/overdue.
      const [{ count: overdueCount }, { count: upcomingCount }] = await Promise.all([
        admin
          .from('expenses')
          .select('id', { count: 'exact', head: true })
          .eq('household_id', h.id)
          .eq('status', 'pending')
          .lt('due_date', todayIso),
        admin
          .from('expenses')
          .select('id', { count: 'exact', head: true })
          .eq('household_id', h.id)
          .eq('status', 'pending')
          .gte('due_date', todayIso)
          .lte('due_date', horizon),
      ]);

      const overdue = overdueCount ?? 0;
      const upcoming = upcomingCount ?? 0;
      if (overdue === 0 && upcoming === 0) continue;

      // Get admin members + their emails.
      const { data: members } = await admin
        .from('household_members')
        .select('user_id, role')
        .eq('household_id', h.id)
        .eq('status', 'active')
        .eq('role', 'admin');

      if (!members || members.length === 0) continue;

      const userIds = members.map((m) => m.user_id).filter((id): id is string => Boolean(id));
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const dashboardUrl = `${(process.env.APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')}/dashboard`;

      for (const p of profiles ?? []) {
        const template = reminderEmailTemplate({
          recipientName: p.full_name ?? p.email,
          householdName: h.name,
          upcoming,
          overdue,
          dashboardUrl,
        });
        try {
          await sendEmail({ to: p.email, ...template });
          emailsSent++;
        } catch (e) {
          console.error('[reminders] email failed', e);
        }

        // Create in-app notification.
        await admin.from('notifications').insert({
          household_id: h.id,
          user_id: p.id,
          type: overdue > 0 ? 'payment_overdue' : 'payment_upcoming',
          title: overdue > 0 ? 'Pagos vencidos' : 'Pagos próximos',
          message:
            overdue > 0
              ? `Tienes ${overdue} pago(s) vencido(s) en ${h.name}`
              : `Tienes ${upcoming} pago(s) próximo(s) en ${h.name}`,
        });
        notificationsCreated++;
      }
      processed++;
    }

    return json({ ok: true, processed, emailsSent, notificationsCreated });
  } catch (err) {
    console.error('[reminders] fatal', err);
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
};
