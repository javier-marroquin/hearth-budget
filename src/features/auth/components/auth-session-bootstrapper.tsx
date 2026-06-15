import { useAuthSession } from '../hooks/use-auth-session';

/**
 * Mount once at the root so the session is restored on load. Renders nothing.
 */
export function AuthSessionBootstrapper(): null {
  useAuthSession();
  return null;
}
