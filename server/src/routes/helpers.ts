import type { Context } from 'hono';
import { withUserContext, type DbClient } from '../db/pool.js';
import { assertMember, assertAdmin, getResourceHouseholdId, MembershipError } from '../db/membership.js';
import type { AppVariables } from '../middleware/session.js';

export function unauthorized(c: Context) {
  return c.json({ error: 'Unauthorized' }, 401);
}

export async function withAuth<T>(
  c: Context<{ Variables: AppVariables }>,
  fn: (client: DbClient, userId: string) => Promise<T>,
): Promise<T | Response> {
  const user = c.get('user');
  if (!user) return unauthorized(c);
  return withUserContext(user.id, (client) => fn(client, user.id));
}

export async function withHouseholdMember<T>(
  c: Context<{ Variables: AppVariables }>,
  householdId: string,
  fn: (client: DbClient, userId: string) => Promise<T>,
): Promise<T | Response> {
  return withAuth(c, async (client, userId) => {
    try {
      await assertMember(client, userId, householdId);
      return fn(client, userId);
    } catch (e) {
      if (e instanceof MembershipError) return c.json({ error: e.message }, 403);
      throw e;
    }
  });
}

export async function withHouseholdAdmin<T>(
  c: Context<{ Variables: AppVariables }>,
  householdId: string,
  fn: (client: DbClient, userId: string) => Promise<T>,
): Promise<T | Response> {
  return withAuth(c, async (client, userId) => {
    try {
      await assertAdmin(client, userId, householdId);
      return fn(client, userId);
    } catch (e) {
      if (e instanceof MembershipError) return c.json({ error: e.message }, 403);
      throw e;
    }
  });
}

export async function withResourceAccess<T>(
  c: Context<{ Variables: AppVariables }>,
  table: string,
  id: string,
  fn: (client: DbClient, userId: string, householdId: string) => Promise<T>,
): Promise<T | Response> {
  return withAuth(c, async (client, userId) => {
    const householdId = await getResourceHouseholdId(client, table, id);
    if (!householdId) return c.json({ error: 'Not found' }, 404);
    try {
      await assertMember(client, userId, householdId);
      return fn(client, userId, householdId);
    } catch (e) {
      if (e instanceof MembershipError) return c.json({ error: e.message }, 403);
      throw e;
    }
  });
}

export async function parseJson(c: Context): Promise<Record<string, unknown>> {
  return (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
}
