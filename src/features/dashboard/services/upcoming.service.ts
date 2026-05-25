/**
 * Unified "what's coming next" feed for the dashboard.
 *
 * Aggregates 5 sources into a single chronologically-sorted list:
 *   1. Pending expenses with a due_date in the window
 *   2. Pending contributions with expected_date in the window
 *   3. Future incomes already materialised by recurring templates
 *   4. Calendar events in the window
 *   5. Savings goals with target_date in the window
 */

import { supabase } from '@/lib/supabase/client';
import { daysUntil, toISODate } from '@/lib/date';

export type UpcomingKind =
  | 'income'
  | 'expense'
  | 'contribution'
  | 'event'
  | 'goal';

export interface UpcomingItem {
  /** Composite id `${kind}:${sourceId}` so React keys are unique across sources. */
  id: string;
  kind: UpcomingKind;
  /** The underlying row id (for click-through). */
  sourceId: string;
  title: string;
  subtitle?: string | null;
  /** ISO date YYYY-MM-DD (or full ISO for events). */
  date: string;
  /** Optional amount. */
  amount?: number | null;
  currency?: string | null;
  /** Negative = overdue, 0 = today, positive = upcoming. */
  daysUntil: number;
  /** Tag pill colour suggestion. */
  tone: 'income' | 'expense' | 'contribution' | 'event' | 'goal';
  /** For category-coloured chips, when available. */
  categoryColor?: string | null;
  /** Tied member (perceptor / contributor / responsible). */
  userId?: string | null;
  status?: string | null;
}

export interface UpcomingResult {
  items: UpcomingItem[];
  totalIncome: number;
  totalExpense: number;
  totalContribution: number;
  overdueCount: number;
}

interface FetchInput {
  householdId: string;
  /** How many days ahead to look. Default 14. */
  windowDays?: number;
  /** Include rows already overdue (negative days). Default true. */
  includeOverdue?: boolean;
}

export async function fetchUpcoming(input: FetchInput): Promise<UpcomingResult> {
  const today = new Date();
  const todayIso = toISODate(today);
  const horizon = toISODate(
    new Date(today.getTime() + (input.windowDays ?? 14) * 86400_000),
  );
  const overdueFrom = input.includeOverdue !== false ? '1900-01-01' : todayIso;

  const [
    expensesRes,
    contributionsRes,
    incomesRes,
    eventsRes,
    goalsRes,
    categoriesRes,
    membersRes,
  ] = await Promise.all([
    supabase
      .from('expenses')
      .select('id, description, amount, currency, due_date, date, status, category_id, paid_by')
      .eq('household_id', input.householdId)
      .neq('status', 'paid')
      .gte('due_date', overdueFrom)
      .lte('due_date', horizon)
      .order('due_date', { ascending: true })
      .limit(40),
    supabase
      .from('contributions')
      .select('id, user_id, amount, currency, expected_date, status')
      .eq('household_id', input.householdId)
      .neq('status', 'received')
      .gte('expected_date', overdueFrom)
      .lte('expected_date', horizon)
      .order('expected_date', { ascending: true })
      .limit(40),
    supabase
      .from('incomes')
      .select('id, user_id, amount, currency, date, source, category_id')
      .eq('household_id', input.householdId)
      .gte('date', todayIso)
      .lte('date', horizon)
      .order('date', { ascending: true })
      .limit(40),
    supabase
      .from('calendar_events')
      .select('id, title, description, start_at, status, amount, event_type, user_id')
      .eq('household_id', input.householdId)
      .gte('start_at', new Date(`${todayIso}T00:00:00.000Z`).toISOString())
      .lte('start_at', new Date(`${horizon}T23:59:59.999Z`).toISOString())
      .order('start_at', { ascending: true })
      .limit(40),
    supabase
      .from('savings_goals')
      .select('id, name, target_amount, current_amount, target_date, status')
      .eq('household_id', input.householdId)
      .eq('status', 'active')
      .not('target_date', 'is', null)
      .lte('target_date', horizon)
      .order('target_date', { ascending: true })
      .limit(20),
    supabase
      .from('categories')
      .select('id, name, color')
      .eq('household_id', input.householdId),
    supabase
      .from('household_members')
      .select('user_id, profiles ( full_name, email )')
      .eq('household_id', input.householdId)
      .eq('status', 'active'),
  ]);

  const errs = [
    expensesRes.error,
    contributionsRes.error,
    incomesRes.error,
    eventsRes.error,
    goalsRes.error,
    categoriesRes.error,
    membersRes.error,
  ].filter(Boolean);
  if (errs.length > 0) throw errs[0];

  const categoriesById = new Map(
    (categoriesRes.data ?? []).map((c) => [c.id, c]),
  );
  const membersById = new Map<
    string,
    { name: string }
  >();
  for (const m of membersRes.data ?? []) {
    if (!m.user_id) continue;
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    const p = profile as { full_name: string | null; email: string } | null;
    membersById.set(m.user_id, {
      name: p?.full_name ?? p?.email ?? 'Miembro',
    });
  }

  const items: UpcomingItem[] = [];
  let totalIncome = 0;
  let totalExpense = 0;
  let totalContribution = 0;
  let overdueCount = 0;

  // Expenses --------------------------------------------------------------
  for (const e of expensesRes.data ?? []) {
    const date = (e.due_date ?? e.date) as string;
    const dUntil = daysUntil(date, today);
    if (dUntil < 0) overdueCount++;
    const cat = e.category_id ? categoriesById.get(e.category_id) : null;
    items.push({
      id: `expense:${e.id}`,
      kind: 'expense',
      sourceId: e.id,
      title: e.description ?? 'Gasto',
      subtitle: cat?.name ?? null,
      date,
      amount: Number(e.amount),
      currency: e.currency,
      daysUntil: dUntil,
      tone: 'expense',
      categoryColor: cat?.color ?? null,
      status: e.status,
    });
    totalExpense += Number(e.amount);
  }

  // Contributions ---------------------------------------------------------
  for (const c of contributionsRes.data ?? []) {
    const dUntil = daysUntil(c.expected_date, today);
    if (dUntil < 0) overdueCount++;
    const member = c.user_id ? membersById.get(c.user_id) : null;
    items.push({
      id: `contribution:${c.id}`,
      kind: 'contribution',
      sourceId: c.id,
      title: `Aporte de ${member?.name ?? 'miembro'}`,
      subtitle: null,
      date: c.expected_date,
      amount: Number(c.amount),
      currency: c.currency,
      daysUntil: dUntil,
      tone: 'contribution',
      userId: c.user_id,
      status: c.status,
    });
    totalContribution += Number(c.amount);
  }

  // Incomes (future-dated rows materialised by recurring templates) -------
  for (const i of incomesRes.data ?? []) {
    const dUntil = daysUntil(i.date, today);
    const cat = i.category_id ? categoriesById.get(i.category_id) : null;
    const member = i.user_id ? membersById.get(i.user_id) : null;
    items.push({
      id: `income:${i.id}`,
      kind: 'income',
      sourceId: i.id,
      title: i.source ?? cat?.name ?? `Ingreso de ${member?.name ?? 'miembro'}`,
      subtitle: member?.name ?? null,
      date: i.date,
      amount: Number(i.amount),
      currency: i.currency,
      daysUntil: dUntil,
      tone: 'income',
      categoryColor: cat?.color ?? null,
      userId: i.user_id,
    });
    totalIncome += Number(i.amount);
  }

  // Calendar events -------------------------------------------------------
  for (const ev of eventsRes.data ?? []) {
    const date = ev.start_at;
    const dUntil = daysUntil(date.slice(0, 10), today);
    items.push({
      id: `event:${ev.id}`,
      kind: 'event',
      sourceId: ev.id,
      title: ev.title,
      subtitle: ev.description ?? ev.event_type ?? null,
      date,
      amount: ev.amount ? Number(ev.amount) : null,
      currency: null,
      daysUntil: dUntil,
      tone: 'event',
      userId: ev.user_id,
      status: ev.status,
    });
  }

  // Goals approaching deadline -------------------------------------------
  for (const g of goalsRes.data ?? []) {
    if (!g.target_date) continue;
    const dUntil = daysUntil(g.target_date, today);
    const remaining = Math.max(
      Number(g.target_amount) - Number(g.current_amount),
      0,
    );
    if (remaining <= 0) continue;
    items.push({
      id: `goal:${g.id}`,
      kind: 'goal',
      sourceId: g.id,
      title: g.name,
      subtitle: 'Meta por completar',
      date: g.target_date,
      amount: remaining,
      currency: null,
      daysUntil: dUntil,
      tone: 'goal',
    });
  }

  // Sort chronologically; ties broken by kind (overdue first then by tone).
  items.sort((a, b) => {
    const da = a.date.slice(0, 10);
    const db = b.date.slice(0, 10);
    if (da !== db) return da < db ? -1 : 1;
    return a.kind.localeCompare(b.kind);
  });

  return {
    items,
    totalIncome,
    totalExpense,
    totalContribution,
    overdueCount,
  };
}
