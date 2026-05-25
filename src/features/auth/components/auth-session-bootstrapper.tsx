import { useAuthSession } from '../hooks/use-auth-session';

/**
 * Mount once at the root of the router so the Supabase auth session listener
 * is always active. Renders nothing.
 */
export function AuthSessionBootstrapper(): null {
  useAuthSession();
  return null;
}
