import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore, type AuthUser } from '../stores/auth.store';
import { useHouseholdStore } from '@/features/households/stores/household.store';

/**
 * Bootstrap and subscribe to Supabase auth state.
 *
 * Mount once at the top of the app (in providers / app shell).
 * Populates the auth store and clears it on sign-out.
 */
export function useAuthSession() {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitializing = useAuthStore((s) => s.setInitializing);
  const resetHousehold = useHouseholdStore((s) => s.reset);

  useEffect(() => {
    let mounted = true;

    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        const session = data.session;
        if (session?.user) {
          setUser(toAuthUser(session.user));
        } else {
          setUser(null);
        }
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session?.user) {
        setUser(toAuthUser(session.user));
      } else {
        setUser(null);
        resetHousehold();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [setUser, setInitializing, resetHousehold]);
}

function toAuthUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): AuthUser {
  const meta = user.user_metadata ?? {};
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: (meta.full_name as string | undefined) ?? null,
    avatar_url: (meta.avatar_url as string | undefined) ?? null,
  };
}
