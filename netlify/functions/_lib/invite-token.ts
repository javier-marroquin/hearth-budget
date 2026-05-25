/**
 * Simple HMAC-signed token for invitations.
 *
 * We deliberately avoid the `jsonwebtoken` dep — Node's built-in crypto
 * gives us everything we need for HS256 signing.
 *
 * Token format: base64url(payload).base64url(signature)
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export interface InvitePayload {
  hid: string; // household id
  mid: string; // membership id (the invited row's id)
  email: string;
  exp: number; // unix seconds
  iat: number;
}

const ALG = 'sha256';

function b64url(input: Buffer | string): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf
    .toString('base64')
    .replace(/=+$/, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  return Buffer.from(padded + pad, 'base64');
}

function getSecret(): string {
  const s = process.env.INVITE_JWT_SECRET;
  if (!s || s.length < 16) {
    throw new Error('INVITE_JWT_SECRET must be at least 16 characters');
  }
  return s;
}

export function signInvite(payload: Omit<InvitePayload, 'iat' | 'exp'>): string {
  const expiresIn = parseExpiresIn(process.env.INVITE_JWT_EXPIRES_IN ?? '7d');
  const now = Math.floor(Date.now() / 1000);
  const full: InvitePayload = { ...payload, iat: now, exp: now + expiresIn };
  const body = b64url(JSON.stringify(full));
  const sig = b64url(createHmac(ALG, getSecret()).update(body).digest());
  return `${body}.${sig}`;
}

export function verifyInvite(token: string): InvitePayload {
  const parts = token.split('.');
  if (parts.length !== 2) throw new Error('Malformed token');
  const [body, sig] = parts as [string, string];
  const expected = b64url(createHmac(ALG, getSecret()).update(body).digest());
  // Constant-time comparison
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('Invalid signature');
  }
  const payload = JSON.parse(b64urlDecode(body).toString('utf8')) as InvitePayload;
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}

function parseExpiresIn(value: string): number {
  // Accepts "7d", "12h", "30m", or plain number of seconds.
  const m = /^(\d+)([smhd])?$/.exec(value);
  if (!m) return 7 * 24 * 60 * 60;
  const n = Number(m[1]);
  const unit = m[2] ?? 's';
  switch (unit) {
    case 's': return n;
    case 'm': return n * 60;
    case 'h': return n * 3600;
    case 'd': return n * 86400;
    default: return n;
  }
}
