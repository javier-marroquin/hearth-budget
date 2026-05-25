import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { FullScreenLoader } from '@/components/layout/full-screen-loader';

/**
 * Guards routes that require an authenticated user.
 * The session listener is mounted at the router root via
 * <AuthSessionBootstrapper />.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);

  if (initializing) return <FullScreenLoader label="Verificando sesión…" />;

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
