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
