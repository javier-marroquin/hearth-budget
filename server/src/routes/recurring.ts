import { Hono } from 'hono';
import { z } from 'zod';
import { recurringTemplateSchema } from '@/schemas/recurring.schema.js';
import type { AppVariables } from '../middleware/session.js';
import {
  createRecurringTemplate,
  deleteRecurringTemplate,
  listRecurringTemplates,
  materializeRecurringTemplates,
  setRecurringTemplateActive,
  updateRecurringTemplate,
} from '../services/recurring.service.js';
import { parseJson, withHouseholdMember, withResourceAccess } from './helpers.js';

const activeBody = z.object({ active: z.boolean() });

export const recurringRoutes = new Hono<{ Variables: AppVariables }>();

recurringRoutes.get('/households/:householdId/recurring-templates', async (c) => {
  const { householdId } = c.req.param();
  const result = await withHouseholdMember(c, householdId, (client) =>
    listRecurringTemplates(client, householdId),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});

recurringRoutes.post('/households/:householdId/recurring-templates', async (c) => {
  const { householdId } = c.req.param();
  const raw = await parseJson(c);
  const parsed = recurringTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const currency =
    c.req.query('currency') ??
    (typeof raw.currency === 'string' ? raw.currency : undefined) ??
    'USD';

  const result = await withHouseholdMember(c, householdId, (client, userId) =>
    createRecurringTemplate(client, householdId, userId, parsed.data, currency),
  );
  if (result instanceof Response) return result;
  return c.json(result, 201);
});

recurringRoutes.patch('/recurring-templates/:id', async (c) => {
  const { id } = c.req.param();
  const body = await parseJson(c);
  const parsed = recurringTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await withResourceAccess(c, 'recurring_templates', id, (client) =>
    updateRecurringTemplate(client, id, parsed.data),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});

recurringRoutes.patch('/recurring-templates/:id/active', async (c) => {
  const { id } = c.req.param();
  const parsed = activeBody.safeParse(await parseJson(c));
  if (!parsed.success) {
    return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }

  const result = await withResourceAccess(c, 'recurring_templates', id, (client) =>
    setRecurringTemplateActive(client, id, parsed.data.active).then(() => ({ ok: true })),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});

recurringRoutes.delete('/recurring-templates/:id', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'recurring_templates', id, (client) =>
    deleteRecurringTemplate(client, id).then(() => ({ ok: true })),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});

recurringRoutes.post('/households/:householdId/recurring-templates/materialize', async (c) => {
  const { householdId } = c.req.param();
  const result = await withHouseholdMember(c, householdId, (client, userId) =>
    materializeRecurringTemplates(client, householdId, userId),
  );
  if (result instanceof Response) return result;
  return c.json(result);
});
