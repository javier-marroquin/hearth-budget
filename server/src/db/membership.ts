import type { DbClient } from './pool.js';

export async function assertMember(
  client: DbClient,
  userId: string,
  householdId: string,
): Promise<{ role: string }> {
  const { rows } = await client.query<{ role: string }>(
    `SELECT role FROM public.household_members
     WHERE household_id = $1 AND user_id = $2 AND status = 'active'`,
    [householdId, userId],
  );
  if (!rows[0]) throw new MembershipError('Not a member of this household');
  return rows[0];
}

export async function assertAdmin(
  client: DbClient,
  userId: string,
  householdId: string,
): Promise<void> {
  const m = await assertMember(client, userId, householdId);
  if (m.role !== 'admin') throw new MembershipError('Admin only');
}

export async function getResourceHouseholdId(
  client: DbClient,
  table: string,
  id: string,
): Promise<string | null> {
  const allowed = new Set([
    'incomes',
    'expenses',
    'categories',
    'contributions',
    'savings_goals',
    'calendar_events',
    'recurring_templates',
    'notifications',
  ]);
  if (!allowed.has(table)) return null;
  const { rows } = await client.query<{ household_id: string }>(
    `SELECT household_id FROM public.${table} WHERE id = $1`,
    [id],
  );
  return rows[0]?.household_id ?? null;
}

export class MembershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MembershipError';
  }
}
