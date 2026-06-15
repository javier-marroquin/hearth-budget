import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { fetchCurrentUser } from '../services/auth.service';

/**
 * Bootstrap auth from API session cookie.
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

    void (async () => {
      try {
        const user = await fetchCurrentUser();
        if (mounted) setUser(user);
      } catch (err) {
        console.warn('[auth] API session bootstrap failed', err);
        if (mounted) {
          setUser(null);
          resetHousehold();
        }
      } finally {
        if (mounted) setInitializing(false);
      }
    })();

    return () => {
      mounted = false;
      window.clearTimeout(initTimeout);
    };
  }, [setUser, setInitializing, resetHousehold]);
}
