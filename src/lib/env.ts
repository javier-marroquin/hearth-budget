/**
 * Centralised, typed access to public env variables (VITE_*).
 */

interface PublicEnv {
  API_URL: string;
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
  API_URL: read('VITE_API_URL', 'http://localhost:3000'),
  APP_NAME: read('VITE_APP_NAME', 'Open Hearth Budget'),
  APP_URL: read('VITE_APP_URL', 'http://localhost:5173'),
  DEFAULT_LOCALE: (read('VITE_DEFAULT_LOCALE', 'es') as 'es' | 'en') ?? 'es',
  DEFAULT_CURRENCY: read('VITE_DEFAULT_CURRENCY', 'COP'),
  DEFAULT_TIMEZONE: read('VITE_DEFAULT_TIMEZONE', 'America/El_Salvador'),
  IS_PROD: import.meta.env.PROD,
};

/** Self-hosted Postgres + API in this repo. */
export const isSelfHosted = (): boolean => true;
