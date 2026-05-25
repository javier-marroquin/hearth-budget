import type { Context } from '@netlify/functions';

export function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      ...headers,
    },
  });
}

export function badRequest(message: string) {
  return json({ error: message }, 400);
}

export function unauthorized(message = 'Unauthorized') {
  return json({ error: message }, 401);
}

export function forbidden(message = 'Forbidden') {
  return json({ error: message }, 403);
}

export function serverError(message = 'Server error') {
  return json({ error: message }, 500);
}

export async function readJson<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

// Keep a reference to Context so we don't shake-import unused.
export type _Context = Context;
