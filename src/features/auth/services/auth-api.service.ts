import { apiFetch, ApiError, type ApiAuthUser } from '@/lib/api/client';
import type { AuthUser } from '@/features/auth/stores/auth.store';

export function toAuthUser(u: ApiAuthUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
  };
}

export async function apiSignIn(email: string, password: string) {
  const data = await apiFetch<{ user: ApiAuthUser }>('/api/auth/sign-in', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  return { user: toAuthUser(data.user), session: true as const };
}

export async function apiSignUp(
  email: string,
  password: string,
  fullName?: string,
) {
  const data = await apiFetch<{ user: ApiAuthUser }>('/api/auth/sign-up', {
    method: 'POST',
    body: JSON.stringify({ email, password, fullName }),
  });
  return { user: toAuthUser(data.user), session: true as const };
}

export async function apiSignOut() {
  await apiFetch('/api/auth/sign-out', { method: 'POST' });
}

export async function apiGetMe(): Promise<AuthUser | null> {
  try {
    const data = await apiFetch<{ user: ApiAuthUser }>('/api/auth/me');
    return toAuthUser(data.user);
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null;
    }
    throw err;
  }
}
