import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';
import { config } from '../config.js';
import { withUserContext } from '../db/pool.js';
import {
  createSession,
  createUserWithProfile,
  deleteSession,
  findProfile,
  findUserByEmail,
  toPublicUser,
  verifyPassword,
} from '../auth/service.js';
import { signInBody, signUpBody } from '../auth/schemas.js';
import type { AppVariables } from '../middleware/session.js';
import {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
} from '../middleware/session.js';

function sessionExpiry(): Date {
  return new Date(Date.now() + config.sessionMs);
}

function validationError(c: Context, parsed: z.SafeParseError<unknown>) {
  return c.json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
}

export const authRoutes = new Hono<{ Variables: AppVariables }>();

authRoutes.post('/sign-up', async (c) => {
  const parsed = signUpBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return validationError(c, parsed);

  const { email, password, fullName } = parsed.data;

  try {
    const result = await withUserContext(null, async (client) => {
      const existing = await findUserByEmail(client, email);
      if (existing) return null;
      const { user, profile } = await createUserWithProfile(client, {
        email,
        password,
        fullName,
      });
      const { token } = await createSession(client, user.id, sessionExpiry());
      return { user, profile, token };
    });

    if (!result) {
      return c.json({ error: 'User already exists' }, 409);
    }

    setSessionCookie(c, result.token);
    return c.json({ user: toPublicUser(result.user, result.profile) }, 201);
  } catch (err) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    ) {
      return c.json({ error: 'User already exists' }, 409);
    }
    console.error('[auth] sign-up', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

authRoutes.post('/sign-in', async (c) => {
  const parsed = signInBody.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return validationError(c, parsed);

  const { email, password } = parsed.data;

  try {
    const result = await withUserContext(null, async (client) => {
      const user = await findUserByEmail(client, email);
      if (!user) return null;
      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) return null;
      const profile = await findProfile(client, user.id);
      if (!profile) return null;
      const { token } = await createSession(client, user.id, sessionExpiry());
      return { user, profile, token };
    });

    if (!result) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    setSessionCookie(c, result.token);
    return c.json({ user: toPublicUser(result.user, result.profile) });
  } catch (err) {
    console.error('[auth] sign-in', err);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

authRoutes.post('/sign-out', async (c) => {
  const token = c.get('sessionToken');
  if (token) {
    await withUserContext(null, (client) => deleteSession(client, token));
  }
  clearSessionCookie(c);
  return c.json({ ok: true });
});

authRoutes.get('/me', requireAuth, (c) => {
  return c.json({ user: c.get('user') });
});
