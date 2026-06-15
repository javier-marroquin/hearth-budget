import './load-env.js';
import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { config } from './config.js';
import { runMigrations } from './db/migrate.js';
import { sessionMiddleware, type AppVariables } from './middleware/session.js';
import { authRoutes } from './routes/auth.js';
import { healthRoutes } from './routes/health.js';
import { householdsRoutes, profileRoutes } from './routes/households.js';
import { resourcesRoutes } from './routes/resources.js';
import { invitesRoutes } from './routes/invites.js';
import { recurringRoutes } from './routes/recurring.js';

const app = new Hono<{ Variables: AppVariables }>();

app.use('*', logger());
app.use(
  '*',
  cors({
    origin: config.CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.use('*', sessionMiddleware);

app.route('/api/health', healthRoutes);
app.route('/api/auth', authRoutes);
app.route('/api/auth/profile', profileRoutes);
app.route('/api/households', householdsRoutes);
app.route('/api', resourcesRoutes);
app.route('/api', invitesRoutes);
app.route('/api', recurringRoutes);

app.onError((err, c) => {
  console.error('[api]', err);
  const message = err instanceof Error ? err.message : 'Internal server error';
  return c.json({ error: message }, 500);
});

app.get('/api', (c) =>
  c.json({
    name: 'Hearth API',
    docs: 'See INSTALL.md',
    endpoints: ['/api/health', '/api/auth/sign-in', '/api/auth/sign-up', '/api/auth/me'],
  }),
);

async function main() {
  console.log('[api] running migrations…');
  await runMigrations();
  console.log(`[api] listening on http://0.0.0.0:${config.PORT}`);

  serve({ fetch: app.fetch, port: config.PORT, hostname: '0.0.0.0' });
}

main().catch((err) => {
  console.error('[api] failed to start', err);
  process.exit(1);
});
