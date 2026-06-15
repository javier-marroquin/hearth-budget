import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { DbClient } from '../db/pool.js';

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  email_verified_at: string | null;
  created_at: string;
}

export interface DbProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale: string;
}

export async function findUserByEmail(
  client: DbClient,
  email: string,
): Promise<DbUser | null> {
  const { rows } = await client.query<DbUser>(
    `SELECT id, email, password_hash, email_verified_at, created_at
     FROM app.users WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  return rows[0] ?? null;
}

export async function findUserById(
  client: DbClient,
  id: string,
): Promise<DbUser | null> {
  const { rows } = await client.query<DbUser>(
    `SELECT id, email, password_hash, email_verified_at, created_at
     FROM app.users WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function findProfile(
  client: DbClient,
  userId: string,
): Promise<DbProfile | null> {
  const { rows } = await client.query<DbProfile>(
    `SELECT id, email, full_name, avatar_url, locale
     FROM public.profiles WHERE id = $1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function createUserWithProfile(
  client: DbClient,
  input: { email: string; password: string; fullName?: string; locale?: string },
): Promise<{ user: DbUser; profile: DbProfile }> {
  const passwordHash = await hashPassword(input.password);
  const fullName =
    input.fullName?.trim() || input.email.split('@')[0] || 'Usuario';

  const { rows: userRows } = await client.query<DbUser>(
    `INSERT INTO app.users (email, password_hash, email_verified_at)
     VALUES ($1, $2, now())
     RETURNING id, email, password_hash, email_verified_at, created_at`,
    [input.email.trim().toLowerCase(), passwordHash],
  );
  const user = userRows[0]!;

  const { rows: profileRows } = await client.query<DbProfile>(
    `INSERT INTO public.profiles (id, email, full_name, locale)
     VALUES ($1, $2, $3, $4)
     RETURNING id, email, full_name, avatar_url, locale`,
    [user.id, user.email, fullName, input.locale ?? 'es'],
  );

  return { user, profile: profileRows[0]! };
}

export async function createSession(
  client: DbClient,
  userId: string,
  expiresAt: Date,
): Promise<{ token: string; sessionId: string }> {
  const token = newSessionToken();
  const tokenHash = hashToken(token);
  const { rows } = await client.query<{ id: string }>(
    `INSERT INTO app.sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [userId, tokenHash, expiresAt.toISOString()],
  );
  return { token, sessionId: rows[0]!.id };
}

export async function findSessionByToken(
  client: DbClient,
  token: string,
): Promise<{ sessionId: string; userId: string } | null> {
  const tokenHash = hashToken(token);
  const { rows } = await client.query<{ id: string; user_id: string }>(
    `SELECT id, user_id FROM app.sessions
     WHERE token_hash = $1 AND expires_at > now()`,
    [tokenHash],
  );
  const row = rows[0];
  if (!row) return null;
  return { sessionId: row.id, userId: row.user_id };
}

export async function deleteSession(client: DbClient, token: string): Promise<void> {
  const tokenHash = hashToken(token);
  await client.query(`DELETE FROM app.sessions WHERE token_hash = $1`, [tokenHash]);
}

export async function deleteExpiredSessions(client: DbClient): Promise<void> {
  await client.query(`DELETE FROM app.sessions WHERE expires_at <= now()`);
}

export function toPublicUser(user: DbUser, profile: DbProfile) {
  return {
    id: user.id,
    email: user.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url,
    locale: profile.locale,
  };
}
