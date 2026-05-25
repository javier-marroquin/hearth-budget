import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';

/**
 * Auth helper hook. The real magic-link implementation lives in F2 once
 * the Supabase client is wired up — for now we just expose stubs so the
 * layout/topbar can compile.
 */
export function useAuth() {
  const navigate = useNavigate();
  const reset = useAuthStore((s) => s.reset);

  return {
    signOut: async () => {
      reset();
      navigate('/login', { replace: true });
    },
  };
}
