import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { FullScreenLoader } from '@/components/layout/full-screen-loader';

/**
 * Guards routes that require an authenticated user.
 * In F1 the auth store is never populated automatically, so unauthenticated
 * users are sent to /login. F2 wires up actual Supabase session detection.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);

  if (initializing) return <FullScreenLoader label="Verificando sesión…" />;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
