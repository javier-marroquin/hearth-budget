import { Hono } from 'hono';
import { z } from 'zod';
import type { AppVariables } from '../middleware/session.js';
import {
  createExpenseWithSplits,
  getExpenseSplits,
} from '../services/expenses.service.js';
import {
  parseJson,
  withAuth,
  withHouseholdMember,
  withResourceAccess,
} from './helpers.js';

export const resourcesRoutes = new Hono<{ Variables: AppVariables }>();

// --- Categories --------------------------------------------------------------

resourcesRoutes.get('/households/:householdId/categories', async (c) => {
  const { householdId } = c.req.param();
  const type = c.req.query('type');
  const result = await withHouseholdMember(c, householdId, async (client) => {
    const sql = type
      ? `SELECT * FROM public.categories WHERE household_id = $1 AND type = $2 ORDER BY name`
      : `SELECT * FROM public.categories WHERE household_id = $1 ORDER BY name`;
    const params = type ? [householdId, type] : [householdId];
    const { rows } = await client.query(sql, params);
    return rows;
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/households/:householdId/categories', async (c) => {
  const { householdId } = c.req.param();
  const body = await parseJson(c);
  const result = await withHouseholdMember(c, householdId, async (client, userId) => {
    const { rows } = await client.query(
      `INSERT INTO public.categories
         (household_id, name, type, color, icon, monthly_budget, rollover_enabled, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        householdId,
        body.name,
        body.type,
        body.color,
        body.icon ?? null,
        body.monthly_budget ?? null,
        body.rollover_enabled ?? false,
        userId,
      ],
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result, 201);
});

resourcesRoutes.patch('/categories/:id', async (c) => {
  const { id } = c.req.param();
  const body = await parseJson(c);
  const result = await withResourceAccess(c, 'categories', id, async (client) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of [
      'name',
      'type',
      'color',
      'icon',
      'monthly_budget',
      'rollover_enabled',
    ] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields' }, 400);
    values.push(id);
    const { rows } = await client.query(
      `UPDATE public.categories SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0] ?? null;
  });
  if (result instanceof Response) return result;
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

resourcesRoutes.delete('/categories/:id', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'categories', id, async (client) => {
    await client.query(`DELETE FROM public.categories WHERE id = $1`, [id]);
    return { ok: true };
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

// --- Incomes -----------------------------------------------------------------

resourcesRoutes.get('/households/:householdId/incomes', async (c) => {
  const { householdId } = c.req.param();
  const { from, to, userId, categoryId } = c.req.query();
  const result = await withHouseholdMember(c, householdId, async (client) => {
    let sql = `SELECT * FROM public.incomes WHERE household_id = $1`;
    const params: unknown[] = [householdId];
    let i = 2;
    if (from) {
      sql += ` AND date >= $${i++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND date <= $${i++}`;
      params.push(to);
    }
    if (userId) {
      sql += ` AND user_id = $${i++}`;
      params.push(userId);
    }
    if (categoryId) {
      sql += ` AND category_id = $${i++}`;
      params.push(categoryId);
    }
    sql += ` ORDER BY date DESC`;
    const { rows } = await client.query(sql, params);
    return rows;
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/households/:householdId/incomes', async (c) => {
  const { householdId } = c.req.param();
  const body = await parseJson(c);
  const result = await withHouseholdMember(c, householdId, async (client, userId) => {
    const { rows } = await client.query(
      `INSERT INTO public.incomes
         (household_id, user_id, amount, currency, date, category_id, source, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        householdId,
        body.user_id,
        body.amount,
        body.currency,
        body.date,
        body.category_id ?? null,
        body.source ?? null,
        body.notes ?? null,
        userId,
      ],
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result, 201);
});

resourcesRoutes.patch('/incomes/:id', async (c) => {
  const { id } = c.req.param();
  const body = await parseJson(c);
  const result = await withResourceAccess(c, 'incomes', id, async (client) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of [
      'user_id',
      'amount',
      'currency',
      'date',
      'category_id',
      'source',
      'notes',
    ] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields' }, 400);
    values.push(id);
    const { rows } = await client.query(
      `UPDATE public.incomes SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.delete('/incomes/:id', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'incomes', id, async (client) => {
    await client.query(`DELETE FROM public.incomes WHERE id = $1`, [id]);
    return { ok: true };
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

// --- Expenses ----------------------------------------------------------------

resourcesRoutes.get('/households/:householdId/expenses', async (c) => {
  const { householdId } = c.req.param();
  const { from, to, status, categoryId, type } = c.req.query();
  const result = await withHouseholdMember(c, householdId, async (client) => {
    let sql = `SELECT * FROM public.expenses WHERE household_id = $1`;
    const params: unknown[] = [householdId];
    let i = 2;
    if (from) {
      sql += ` AND date >= $${i++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND date <= $${i++}`;
      params.push(to);
    }
    if (status) {
      sql += ` AND status = $${i++}`;
      params.push(status);
    }
    if (categoryId) {
      sql += ` AND category_id = $${i++}`;
      params.push(categoryId);
    }
    if (type) {
      sql += ` AND type = $${i++}`;
      params.push(type);
    }
    sql += ` ORDER BY date DESC`;
    const { rows } = await client.query(sql, params);
    return rows;
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.get('/expenses/:id/splits', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'expenses', id, async (client) => {
    return getExpenseSplits(client, id);
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/households/:householdId/expenses', async (c) => {
  const { householdId } = c.req.param();
  const body = await parseJson(c);
  const split = body.split as
    | { method: 'equal' | 'percentage' | 'income_based' | 'custom'; participants: Array<{ userId: string }> }
    | undefined;
  const result = await withHouseholdMember(c, householdId, async (client, userId) => {
    return createExpenseWithSplits(client, {
      household_id: householdId,
      amount: Number(body.amount),
      currency: String(body.currency),
      date: String(body.date),
      due_date: body.due_date != null ? String(body.due_date) : null,
      category_id: body.category_id != null ? String(body.category_id) : null,
      type: String(body.type),
      status: body.status != null ? String(body.status) : undefined,
      split_method:
        (split?.method ??
          (typeof body.split_method === 'string' ? body.split_method : 'equal')) as
          | 'equal'
          | 'percentage'
          | 'income_based'
          | 'custom',
      description: body.description != null ? String(body.description) : null,
      notes: body.notes != null ? String(body.notes) : null,
      created_by: userId,
      split: split ?? { method: 'equal', participants: [] },
    });
  });
  if (result instanceof Response) return result;
  return c.json(result, 201);
});

resourcesRoutes.patch('/expenses/:id', async (c) => {
  const { id } = c.req.param();
  const body = await parseJson(c);
  const result = await withResourceAccess(c, 'expenses', id, async (client) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of [
      'amount',
      'currency',
      'date',
      'due_date',
      'category_id',
      'type',
      'status',
      'description',
      'notes',
      'paid_at',
      'paid_by',
    ] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields' }, 400);
    values.push(id);
    const { rows } = await client.query(
      `UPDATE public.expenses SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/expenses/:id/mark-paid', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'expenses', id, async (client, userId) => {
    const { rows } = await client.query(
      `UPDATE public.expenses
       SET status = 'paid', paid_at = now(), paid_by = $1, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [userId, id],
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.delete('/expenses/:id', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'expenses', id, async (client) => {
    await client.query(`DELETE FROM public.expense_splits WHERE expense_id = $1`, [id]);
    await client.query(`DELETE FROM public.expenses WHERE id = $1`, [id]);
    return { ok: true };
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

// --- Contributions -----------------------------------------------------------

resourcesRoutes.get('/households/:householdId/contributions', async (c) => {
  const { householdId } = c.req.param();
  const { from, to, status, userId } = c.req.query();
  const result = await withHouseholdMember(c, householdId, async (client) => {
    let sql = `SELECT * FROM public.contributions WHERE household_id = $1`;
    const params: unknown[] = [householdId];
    let i = 2;
    if (from) {
      sql += ` AND expected_date >= $${i++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND expected_date <= $${i++}`;
      params.push(to);
    }
    if (status) {
      sql += ` AND status = $${i++}`;
      params.push(status);
    }
    if (userId) {
      sql += ` AND user_id = $${i++}`;
      params.push(userId);
    }
    sql += ` ORDER BY expected_date DESC`;
    const { rows } = await client.query(sql, params);
    return rows;
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/households/:householdId/contributions', async (c) => {
  const { householdId } = c.req.param();
  const body = await parseJson(c);
  const result = await withHouseholdMember(c, householdId, async (client, userId) => {
    const status =
      body.status ?? (body.received_date ? 'received' : 'pending');
    const { rows } = await client.query(
      `INSERT INTO public.contributions
         (household_id, user_id, amount, currency, expected_date, received_date, status, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        householdId,
        body.user_id,
        body.amount,
        body.currency,
        body.expected_date,
        body.received_date ?? null,
        status,
        body.notes ?? null,
        userId,
      ],
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result, 201);
});

resourcesRoutes.patch('/contributions/:id', async (c) => {
  const { id } = c.req.param();
  const body = await parseJson(c);
  const result = await withResourceAccess(c, 'contributions', id, async (client) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of [
      'user_id',
      'amount',
      'currency',
      'expected_date',
      'received_date',
      'status',
      'notes',
    ] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields' }, 400);
    values.push(id);
    const { rows } = await client.query(
      `UPDATE public.contributions SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/contributions/:id/mark-received', async (c) => {
  const { id } = c.req.param();
  const today = new Date().toISOString().slice(0, 10);
  const result = await withResourceAccess(c, 'contributions', id, async (client) => {
    const { rows } = await client.query(
      `UPDATE public.contributions
       SET status = 'received', received_date = $1, updated_at = now()
       WHERE id = $2 RETURNING *`,
      [today, id],
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.delete('/contributions/:id', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'contributions', id, async (client) => {
    await client.query(`DELETE FROM public.contributions WHERE id = $1`, [id]);
    return { ok: true };
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

// --- Savings goals -----------------------------------------------------------

resourcesRoutes.get('/households/:householdId/goals', async (c) => {
  const { householdId } = c.req.param();
  const result = await withHouseholdMember(c, householdId, async (client) => {
    const { rows } = await client.query(
      `SELECT * FROM public.savings_goals WHERE household_id = $1
       ORDER BY created_at DESC`,
      [householdId],
    );
    return rows;
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/households/:householdId/goals', async (c) => {
  const { householdId } = c.req.param();
  const body = await parseJson(c);
  const result = await withHouseholdMember(c, householdId, async (client, userId) => {
    const { rows } = await client.query(
      `INSERT INTO public.savings_goals
         (household_id, name, target_amount, target_date, category_id, notes, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        householdId,
        body.name,
        body.target_amount,
        body.target_date ?? null,
        body.category_id ?? null,
        body.notes ?? null,
        userId,
      ],
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result, 201);
});

resourcesRoutes.patch('/goals/:id', async (c) => {
  const { id } = c.req.param();
  const body = await parseJson(c);
  const result = await withResourceAccess(c, 'savings_goals', id, async (client) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of [
      'name',
      'target_amount',
      'current_amount',
      'target_date',
      'category_id',
      'notes',
      'status',
    ] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields' }, 400);
    values.push(id);
    const { rows } = await client.query(
      `UPDATE public.savings_goals SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/goals/:id/add', async (c) => {
  const { id } = c.req.param();
  const body = z.object({ delta: z.number() }).safeParse(await parseJson(c));
  if (!body.success) return c.json({ error: 'Invalid delta' }, 400);
  const result = await withResourceAccess(c, 'savings_goals', id, async (client) => {
    const { rows: current } = await client.query(
      `SELECT current_amount, target_amount FROM public.savings_goals WHERE id = $1`,
      [id],
    );
    if (!current[0]) return null;
    const next = Math.max(Number(current[0].current_amount) + body.data.delta, 0);
    const status = next >= Number(current[0].target_amount) ? 'completed' : 'active';
    const { rows } = await client.query(
      `UPDATE public.savings_goals
       SET current_amount = $1, status = $2, updated_at = now()
       WHERE id = $3 RETURNING *`,
      [next, status, id],
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});

resourcesRoutes.delete('/goals/:id', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'savings_goals', id, async (client) => {
    await client.query(`DELETE FROM public.savings_goals WHERE id = $1`, [id]);
    return { ok: true };
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

// --- Calendar events ---------------------------------------------------------

resourcesRoutes.get('/households/:householdId/calendar-events', async (c) => {
  const { householdId } = c.req.param();
  const { from, to, userId, status, eventType } = c.req.query();
  const result = await withHouseholdMember(c, householdId, async (client) => {
    let sql = `SELECT * FROM public.calendar_events WHERE household_id = $1`;
    const params: unknown[] = [householdId];
    let i = 2;
    if (from) {
      sql += ` AND start_at >= $${i++}`;
      params.push(from);
    }
    if (to) {
      sql += ` AND start_at <= $${i++}`;
      params.push(to);
    }
    if (userId) {
      sql += ` AND user_id = $${i++}`;
      params.push(userId);
    }
    if (status) {
      sql += ` AND status = $${i++}`;
      params.push(status);
    }
    if (eventType) {
      sql += ` AND event_type = $${i++}`;
      params.push(eventType);
    }
    sql += ` ORDER BY start_at ASC`;
    const { rows } = await client.query(sql, params);
    return rows;
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/households/:householdId/calendar-events', async (c) => {
  const { householdId } = c.req.param();
  const body = await parseJson(c);
  const result = await withHouseholdMember(c, householdId, async (client, userId) => {
    const { rows } = await client.query(
      `INSERT INTO public.calendar_events
         (household_id, title, description, event_type, start_at, end_at, all_day,
          status, user_id, amount, color, related_id, related_type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        householdId,
        body.title,
        body.description ?? null,
        body.event_type,
        body.start_at,
        body.end_at ?? null,
        body.all_day ?? true,
        body.status ?? 'pending',
        body.user_id ?? null,
        body.amount ?? null,
        body.color ?? null,
        body.related_id ?? null,
        body.related_type ?? null,
        userId,
      ],
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result, 201);
});

resourcesRoutes.patch('/calendar-events/:id', async (c) => {
  const { id } = c.req.param();
  const body = await parseJson(c);
  const result = await withResourceAccess(c, 'calendar_events', id, async (client) => {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;
    for (const key of [
      'title',
      'description',
      'event_type',
      'start_at',
      'end_at',
      'all_day',
      'status',
      'user_id',
      'amount',
      'color',
      'related_id',
      'related_type',
    ] as const) {
      if (body[key] !== undefined) {
        fields.push(`${key} = $${i++}`);
        values.push(body[key]);
      }
    }
    if (fields.length === 0) return c.json({ error: 'No fields' }, 400);
    values.push(id);
    const { rows } = await client.query(
      `UPDATE public.calendar_events SET ${fields.join(', ')}, updated_at = now()
       WHERE id = $${i} RETURNING *`,
      values,
    );
    return rows[0];
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.delete('/calendar-events/:id', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'calendar_events', id, async (client) => {
    await client.query(`DELETE FROM public.calendar_events WHERE id = $1`, [id]);
    return { ok: true };
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

// --- Notifications -----------------------------------------------------------

resourcesRoutes.get('/households/:householdId/notifications', async (c) => {
  const { householdId } = c.req.param();
  const result = await withHouseholdMember(c, householdId, async (client, userId) => {
    const { rows } = await client.query(
      `SELECT * FROM public.notifications
       WHERE household_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 50`,
      [householdId, userId],
    );
    return rows;
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/households/:householdId/notifications/mark-all-read', async (c) => {
  const { householdId } = c.req.param();
  const result = await withHouseholdMember(c, householdId, async (client, userId) => {
    await client.query(
      `UPDATE public.notifications
       SET read = true, read_at = now()
       WHERE household_id = $1 AND user_id = $2 AND read = false`,
      [householdId, userId],
    );
    return { ok: true };
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

resourcesRoutes.post('/notifications/:id/mark-read', async (c) => {
  const { id } = c.req.param();
  const result = await withResourceAccess(c, 'notifications', id, async (client) => {
    await client.query(
      `UPDATE public.notifications SET read = true, read_at = now() WHERE id = $1`,
      [id],
    );
    return { ok: true };
  });
  if (result instanceof Response) return result;
  return c.json(result);
});

// --- Profile lookup ----------------------------------------------------------

resourcesRoutes.get('/profiles/:id', async (c) => {
  const { id } = c.req.param();
  const result = await withAuth(c, async (client, userId) => {
    if (id !== userId) {
      const { rows: m } = await client.query(
        `SELECT 1 FROM public.household_members a
         INNER JOIN public.household_members b
           ON a.household_id = b.household_id AND b.user_id = $2
         WHERE a.user_id = $1 AND a.status = 'active' AND b.status = 'active'
         LIMIT 1`,
        [id, userId],
      );
      if (!m[0]) return c.json({ error: 'Forbidden' }, 403);
    }
    const { rows } = await client.query(`SELECT * FROM public.profiles WHERE id = $1`, [id]);
    return rows[0] ?? null;
  });
  if (result instanceof Response) return result;
  if (!result) return c.json({ error: 'Not found' }, 404);
  return c.json(result);
});
