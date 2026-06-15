import type { DbClient } from '../db/pool.js';
import { daysUntil, toISODate } from '@/lib/date.js';

export type UpcomingKind = 'income' | 'expense' | 'contribution' | 'event' | 'goal';

export interface UpcomingItem {
  id: string;
  kind: UpcomingKind;
  sourceId: string;
  title: string;
  subtitle?: string | null;
  date: string;
  amount?: number | null;
  currency?: string | null;
  daysUntil: number;
  tone: 'income' | 'expense' | 'contribution' | 'event' | 'goal';
  categoryColor?: string | null;
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

export async function fetchUpcoming(
  client: DbClient,
  householdId: string,
  input: { windowDays?: number; includeOverdue?: boolean } = {},
): Promise<UpcomingResult> {
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
    client.query(
      `SELECT id, description, amount, currency, due_date, date, status, category_id, paid_by
       FROM public.expenses
       WHERE household_id = $1 AND status != 'paid'
         AND due_date >= $2 AND due_date <= $3
       ORDER BY due_date ASC LIMIT 40`,
      [householdId, overdueFrom, horizon],
    ),
    client.query(
      `SELECT id, user_id, amount, currency, expected_date, status
       FROM public.contributions
       WHERE household_id = $1 AND status != 'received'
         AND expected_date >= $2 AND expected_date <= $3
       ORDER BY expected_date ASC LIMIT 40`,
      [householdId, overdueFrom, horizon],
    ),
    client.query(
      `SELECT id, user_id, amount, currency, date, source, category_id
       FROM public.incomes
       WHERE household_id = $1 AND date >= $2 AND date <= $3
       ORDER BY date ASC LIMIT 40`,
      [householdId, todayIso, horizon],
    ),
    client.query(
      `SELECT id, title, description, start_at, status, amount, event_type, user_id
       FROM public.calendar_events
       WHERE household_id = $1
         AND start_at >= $2 AND start_at <= $3
       ORDER BY start_at ASC LIMIT 40`,
      [
        householdId,
        new Date(`${todayIso}T00:00:00.000Z`).toISOString(),
        new Date(`${horizon}T23:59:59.999Z`).toISOString(),
      ],
    ),
    client.query(
      `SELECT id, name, target_amount, current_amount, target_date, status
       FROM public.savings_goals
       WHERE household_id = $1 AND status = 'active'
         AND target_date IS NOT NULL AND target_date <= $2
       ORDER BY target_date ASC LIMIT 20`,
      [householdId, horizon],
    ),
    client.query(
      `SELECT id, name, color FROM public.categories WHERE household_id = $1`,
      [householdId],
    ),
    client.query(
      `SELECT hm.user_id, p.full_name, p.email
       FROM public.household_members hm
       LEFT JOIN public.profiles p ON p.id = hm.user_id
       WHERE hm.household_id = $1 AND hm.status = 'active'`,
      [householdId],
    ),
  ]);

  const categoriesById = new Map(
    categoriesRes.rows.map((c: { id: string; name: string; color: string }) => [c.id, c]),
  );
  const membersById = new Map<string, { name: string }>();
  for (const m of membersRes.rows as Array<{
    user_id: string;
    full_name: string | null;
    email: string;
  }>) {
    if (!m.user_id) continue;
    membersById.set(m.user_id, {
      name: m.full_name ?? m.email ?? 'Miembro',
    });
  }

  const items: UpcomingItem[] = [];
  let totalIncome = 0;
  let totalExpense = 0;
  let totalContribution = 0;
  let overdueCount = 0;

  for (const e of expensesRes.rows as Array<{
    id: string;
    description: string | null;
    amount: number;
    currency: string;
    due_date: string | null;
    date: string;
    status: string;
    category_id: string | null;
  }>) {
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

  for (const c of contributionsRes.rows as Array<{
    id: string;
    user_id: string;
    amount: number;
    currency: string;
    expected_date: string;
    status: string;
  }>) {
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

  for (const i of incomesRes.rows as Array<{
    id: string;
    user_id: string | null;
    amount: number;
    currency: string;
    date: string;
    source: string | null;
    category_id: string | null;
  }>) {
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

  for (const ev of eventsRes.rows as Array<{
    id: string;
    title: string;
    description: string | null;
    start_at: string;
    status: string;
    amount: number | null;
    event_type: string;
    user_id: string | null;
  }>) {
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

  for (const g of goalsRes.rows as Array<{
    id: string;
    name: string;
    target_amount: number;
    current_amount: number;
    target_date: string | null;
  }>) {
    if (!g.target_date) continue;
    const dUntil = daysUntil(g.target_date, today);
    const remaining = Math.max(Number(g.target_amount) - Number(g.current_amount), 0);
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

  items.sort((a, b) => {
    const da = a.date.slice(0, 10);
    const db = b.date.slice(0, 10);
    if (da !== db) return da < db ? -1 : 1;
    return a.kind.localeCompare(b.kind);
  });

  return { items, totalIncome, totalExpense, totalContribution, overdueCount };
}
