/**
 * Centralised, typed access to public env variables (VITE_*).
 * Server-only variables (SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, etc.)
 * are NOT read here — they are accessed only inside Netlify Functions.
 */

interface PublicEnv {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  APP_NAME: string;
  APP_URL: string;
  DEFAULT_LOCALE: 'es' | 'en';
  DEFAULT_CURRENCY: string;
  DEFAULT_TIMEZONE: string;
  IS_PROD: boolean;
}

function read(key: string, fallback?: string): string {
  const value = import.meta.env[key as keyof ImportMetaEnv] as string | undefined;
  if (value !== undefined && value !== '') return value;
  if (fallback !== undefined) return fallback;
  console.warn(`[env] Missing required variable: ${key}`);
  return '';
}

export const env: PublicEnv = {
  SUPABASE_URL: read('VITE_SUPABASE_URL'),
  SUPABASE_ANON_KEY: read('VITE_SUPABASE_ANON_KEY'),
  APP_NAME: read('VITE_APP_NAME', 'PresupuestoHogar'),
  APP_URL: read('VITE_APP_URL', 'http://localhost:5173'),
  DEFAULT_LOCALE: (read('VITE_DEFAULT_LOCALE', 'es') as 'es' | 'en') ?? 'es',
  DEFAULT_CURRENCY: read('VITE_DEFAULT_CURRENCY', 'COP'),
  DEFAULT_TIMEZONE: read('VITE_DEFAULT_TIMEZONE', 'America/El_Salvador'),
  IS_PROD: import.meta.env.PROD,
};

/** True when both required Supabase variables are present. */
export const isSupabaseConfigured = (): boolean =>
  Boolean(env.SUPABASE_URL && env.SUPABASE_ANON_KEY);
