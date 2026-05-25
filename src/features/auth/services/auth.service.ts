import type { EmailOtpType, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { env } from '@/lib/env';

export interface MagicLinkOptions {
  email: string;
  /** Optional invite token to attach to redirect URL. */
  inviteToken?: string;
}

/**
 * Send a magic link to the user's email. Uses Supabase Auth's
 * `signInWithOtp` which works for both sign-up and sign-in.
 */
export async function sendMagicLink({ email, inviteToken }: MagicLinkOptions) {
  const redirectBase = env.APP_URL.replace(/\/$/, '');
  const redirectTo = inviteToken
    ? `${redirectBase}/auth/callback?invite=${encodeURIComponent(inviteToken)}`
    : `${redirectBase}/auth/callback`;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) throw error;
}

/** Remove auth tokens from the address bar after a successful callback. */
function stripAuthParamsFromUrl(): void {
  const url = new URL(window.location.href);
  for (const key of ['code', 'token_hash', 'type', 'error', 'error_description']) {
    url.searchParams.delete(key);
  }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  for (const key of [
    'access_token',
    'refresh_token',
    'expires_in',
    'token_type',
    'type',
    'provider_token',
    'provider_refresh_token',
  ]) {
    hash.delete(key);
  }
  const search = url.searchParams.toString();
  const hashStr = hash.toString();
  const next =
    url.pathname +
    (search ? `?${search}` : '') +
    (hashStr ? `#${hashStr}` : '');
  window.history.replaceState({}, document.title, next);
}

/**
 * After a Magic Link redirect, resolve the session from URL params/hash.
 * Supports implicit (`#access_token=…`), PKCE (`?code=…`), and OTP (`token_hash`).
 */
export async function resolveCallbackSession(timeoutMs = 15_000): Promise<Session | null> {
  const url = new URL(window.location.href);
  const authError =
    url.searchParams.get('error_description') ?? url.searchParams.get('error');
  if (authError) {
    throw new Error(decodeURIComponent(authError.replace(/\+/g, ' ')));
  }

  const { data: existing, error: existingError } = await supabase.auth.getSession();
  if (existingError) throw existingError;
  if (existing.session) {
    stripAuthParamsFromUrl();
    return existing.session;
  }

  const code = url.searchParams.get('code');
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const { data: retry } = await supabase.auth.getSession();
      if (retry.session) {
        stripAuthParamsFromUrl();
        return retry.session;
      }
      throw error;
    }
    stripAuthParamsFromUrl();
    return data.session;
  }

  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) throw error;
    stripAuthParamsFromUrl();
    return data.session;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      stripAuthParamsFromUrl();
      return data.session;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return null;
}

/** Read the current session (if any). */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

/** Update the signed-in user's display name (profiles + auth metadata). */
export async function updateMyProfile(input: { fullName: string }) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error('Not authenticated');

  const fullName = input.fullName.trim();

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  if (profileError) throw profileError;

  const { error: metaError } = await supabase.auth.updateUser({
    data: { full_name: fullName },
  });

  if (metaError) throw metaError;

  return { id: user.id, full_name: fullName };
}

/** Fetch the profile row for a user id. */
export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}
