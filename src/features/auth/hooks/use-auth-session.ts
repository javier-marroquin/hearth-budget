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

    const initTimeout = window.setTimeout(() => {
      if (mounted && useAuthStore.getState().initializing) {
        console.warn('[auth] session bootstrap timed out; clearing loading state');
        setInitializing(false);
      }
    }, 10_000);

    const enrichProfile = (userId: string) => {
      // Defer so we never await inside onAuthStateChange (Supabase deadlock risk).
      window.setTimeout(() => {
        void (async () => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', userId)
            .maybeSingle();

          if (!mounted) return;
          const current = useAuthStore.getState().user;
          if (!current || current.id !== userId) return;

          setUser({
            ...current,
            full_name: profile?.full_name ?? current.full_name,
            avatar_url: profile?.avatar_url ?? current.avatar_url,
          });
        })();
      }, 0);
    };

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;

        if (error) {
          console.warn('[auth] getSession failed', error);
          setUser(null);
          return;
        }

        const session = data.session;
        if (session?.user) {
          setUser(toAuthUser(session.user));
          enrichProfile(session.user.id);
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
        enrichProfile(session.user.id);
      } else {
        setUser(null);
        resetHousehold();
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(initTimeout);
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
