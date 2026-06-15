import { Hono } from 'hono';
import { z } from 'zod';
import type { AppVariables } from '../middleware/session.js';
import {
  createHousehold,
  listMembers,
  listMyHouseholds,
  updateProfile,
} from '../services/households.service.js';
import { fetchHouseholdKpis } from '../services/kpis.service.js';
import { fetchUpcoming } from '../services/upcoming.service.js';
import { exportHouseholdBackup } from '../services/backup.service.js';
import {
  parseJson,
  unauthorized,
  withAuth,
  withHouseholdMember,
} from './helpers.js';

const createBody = z.object({
  name: z.string().min(1).max(120),
  currency: z.string().min(3).max(3),
  timezone: z.string().min(1),
});

export const householdsRoutes = new Hono<{ Variables: AppVariables }>();

householdsRoutes.get('/', async (c) => {
  const result = await withAuth(c, (client, userId) => listMyHouseholds(client, userId));
  if (result instanceof Response) return result;
  return c.json(result);
});

householdsRoutes.post('/', async (c) => {
  const parsed = createBody.safeParse(await parseJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }
  const result = await withAuth(c, (client, userId) =>
    createHousehold(client, userId, parsed.data),
  );
  if (result instanceof Response) return result;
  return c.json(result, 201);
});

householdsRoutes.get('/:householdId/members', async (c) => {
  const { householdId } = c.req.param();
  const result = await withHouseholdMember(c, householdId, (client) =>
    listMembers(client, householdId),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});

householdsRoutes.get('/:householdId/kpis', async (c) => {
  const { householdId } = c.req.param();
  const ref = c.req.query('referenceDate');
  const referenceDate = ref ? new Date(ref) : undefined;
  const result = await withHouseholdMember(c, householdId, (client) =>
    fetchHouseholdKpis(client, householdId, referenceDate),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});

householdsRoutes.get('/:householdId/upcoming', async (c) => {
  const { householdId } = c.req.param();
  const windowDays = c.req.query('windowDays');
  const includeOverdue = c.req.query('includeOverdue');
  const result = await withHouseholdMember(c, householdId, (client) =>
    fetchUpcoming(client, householdId, {
      windowDays: windowDays ? Number(windowDays) : undefined,
      includeOverdue: includeOverdue !== 'false',
    }),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});

const updateHouseholdBody = z.object({
  envelope_mode_enabled: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
  currency: z.string().length(3).optional(),
  timezone: z.string().min(1).optional(),
});

householdsRoutes.patch('/:householdId', async (c) => {
  const { householdId } = c.req.param();
  const parsed = updateHouseholdBody.safeParse(await parseJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }
  const body = parsed.data;
  const result = await withHouseholdMember(c, householdId, async (client) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of ['envelope_mode_enabled', 'name', 'currency', 'timezone'] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields' }, 400);
    values.push(householdId);
    const { rows } = await client.query(
      `UPDATE public.households SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${i}
       RETURNING id, name, currency, timezone, envelope_mode_enabled`,
      values,
    );
    return rows[0] ?? null;
  });
  if (result instanceof Response) return result;
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

householdsRoutes.get('/:householdId/backup', async (c) => {
  const { householdId } = c.req.param();
  const result = await withHouseholdMember(c, householdId, (client) =>
    exportHouseholdBackup(client, householdId),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});

const profileBody = z.object({ fullName: z.string().min(1).max(120) });

export const profileRoutes = new Hono<{ Variables: AppVariables }>();

profileRoutes.patch('/', async (c) => {
  const user = c.get('user');
  if (!user) return unauthorized(c);
  const parsed = profileBody.safeParse(await parseJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }
  const result = await withAuth(c, (client, userId) =>
    updateProfile(client, userId, parsed.data.fullName),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});
