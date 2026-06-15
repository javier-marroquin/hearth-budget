import { Hono } from 'hono';
import { pingDb } from '../middleware/session.js';

export const healthRoutes = new Hono();

healthRoutes.get('/', async (c) => {
  const db = await pingDb();
  const status = db ? 200 : 503;
  return c.json(
    {
      ok: db,
      service: 'hearth-budget-api',
      version: '0.1.0',
      db,
    },
    status,
  );
});
