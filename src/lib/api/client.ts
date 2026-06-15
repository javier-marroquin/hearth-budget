/**
 * HTTP client for the self-hosted API (credentials = session cookie).
 */
import { env } from '@/lib/env';
import i18n from '@/i18n';

function apiBase(): string {
  if (import.meta.env.DEV) {
    // Vite proxies /api → localhost:3000
    return '';
  }
  return env.API_URL.replace(/\/$/, '');
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${apiBase()}${path.startsWith('/') ? path : `/${path}`}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });
  } catch (cause) {
    throw new ApiError(
      i18n.t('errors.api_unreachable'),
      0,
      cause,
    );
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError(
        text.trim().slice(0, 200) || res.statusText || 'Request failed',
        res.status,
      );
    }
  }

  if (!res.ok) {
    const msg =
      typeof body === 'object' &&
      body !== null &&
      'error' in body &&
      typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : typeof body === 'object' &&
            body !== null &&
            'error' in body &&
            typeof (body as { error: { message?: string } }).error === 'object'
          ? ((body as { error: { message?: string } }).error.message ??
            res.statusText)
          : res.statusText;
    throw new ApiError(msg || 'Request failed', res.status, body);
  }

  return body as T;
}

export interface ApiAuthUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  locale?: string;
}
