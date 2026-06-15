import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import type { Context, Next } from 'hono';
import { config } from '../config.js';
import { pool, withUserContext } from '../db/pool.js';
import {
  findProfile,
  findSessionByToken,
  findUserById,
  toPublicUser,
} from '../auth/service.js';

export const SESSION_COOKIE = 'hb_session';

export type AuthUser = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string;
};

export type AppVariables = {
  user: AuthUser | null;
  sessionToken: string | null;
};

export function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'Lax',
    path: '/',
    maxAge: config.sessionMs / 1000,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: '/' });
}

export async function resolveSession(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;

  return withUserContext(null, async (client) => {
    const session = await findSessionByToken(client, token);
    if (!session) return null;

    const user = await findUserById(client, session.userId);
    const profile = await findProfile(client, session.userId);
    if (!user || !profile) return null;

    return toPublicUser(user, profile);
  });
}

export async function sessionMiddleware(c: Context, next: Next) {
  const token = getCookie(c, SESSION_COOKIE);
  c.set('sessionToken', token ?? null);
  c.set('user', await resolveSession(token));
  await next();
}

export async function requireAuth(c: Context, next: Next) {
  const user = c.get('user');
  if (!user) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  await next();
}

/** Health check for DB connectivity. */
export async function pingDb(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
