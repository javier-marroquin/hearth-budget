import { apiFetch } from '@/lib/api/client';
import {
  apiGetMe,
  apiSignIn,
  apiSignOut,
  apiSignUp,
} from './auth-api.service';
import type { AuthUser } from '../stores/auth.store';

export interface SignInOptions {
  email: string;
  password: string;
}

export interface SignUpOptions {
  email: string;
  password: string;
  fullName?: string;
  inviteToken?: string;
}

export type AuthResult = {
  user: AuthUser;
  session: true | null;
};

/** Sign in with email and password. */
export async function signInWithPassword({
  email,
  password,
}: SignInOptions): Promise<AuthResult> {
  return apiSignIn(email, password);
}

/** Create an account with email and password. */
export async function signUpWithPassword({
  email,
  password,
  fullName,
}: SignUpOptions): Promise<AuthResult> {
  return apiSignUp(email, password, fullName);
}

/** Resend signup confirmation email (not used in self-hosted mode). */
export async function resendSignupConfirmation(_email: string) {
  return;
}

/** Bootstrap: current user from API session cookie. */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  return apiGetMe();
}

/**
 * After an email confirmation redirect, resolve the session.
 * Self-hosted mode uses cookie sessions — checks /api/auth/me.
 */
export async function resolveCallbackSession(): Promise<true | null> {
  const user = await apiGetMe();
  return user ? true : null;
}

/** Read the current session (if any). */
export async function getSession() {
  const user = await apiGetMe();
  return user ? { user: { id: user.id } } : null;
}

export async function signOut() {
  await apiSignOut();
}

/** Update the signed-in user's display name. */
export async function updateMyProfile(input: { fullName: string }) {
  return apiFetch<{ id: string; full_name: string }>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify({ fullName: input.fullName.trim() }),
  });
}

/** Fetch the profile row for a user id. */
export async function getProfile(userId: string) {
  return apiFetch(`/api/profiles/${userId}`);
}
