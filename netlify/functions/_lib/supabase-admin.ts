import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Service-role Supabase client for Netlify Functions.
 * Bypasses RLS — use ONLY server-side.
 */
let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars in Netlify Functions',
    );
  }

  _admin = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return _admin;
}

/**
 * Identify the calling user from the Authorization Bearer token.
 * Validates the JWT against Supabase and returns the user record.
 */
export async function getCallerFromAuth(
  authHeader: string | null | undefined,
): Promise<{ id: string; email: string }> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing Authorization header');
  }
  const token = authHeader.slice('Bearer '.length);
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid token');
  return { id: data.user.id, email: data.user.email ?? '' };
}
