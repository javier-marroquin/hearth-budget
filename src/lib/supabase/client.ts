import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '@/lib/env';
import type { Database } from './database.types';

let _client: SupabaseClient<Database> | null = null;

/**
 * Lazy singleton Supabase client.
 *
 * If env vars are missing we still return a *configured-but-stub* client so
 * the rest of the app can render. Calls that hit Supabase will fail with
 * a clear error message instead of crashing the bundle on import.
 */
export function getSupabase(): SupabaseClient<Database> {
  if (_client) return _client;

  if (!isSupabaseConfigured()) {
    console.warn(
      '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set. ' +
        'Network calls will fail until .env.local is configured.',
    );
  }

  _client = createClient<Database>(
    env.SUPABASE_URL || 'https://placeholder.supabase.co',
    env.SUPABASE_ANON_KEY || 'placeholder-anon-key',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'household-budget:auth',
        // Implicit flow: magic links from email often open in another browser/app;
        // PKCE requires the same browser that called signInWithOtp (code verifier).
        flowType: 'implicit',
      },
      global: {
        headers: { 'X-Client-Info': 'household-budget-web' },
      },
      realtime: {
        params: { eventsPerSecond: 5 },
      },
    },
  );
  return _client;
}

export const supabase = getSupabase();
