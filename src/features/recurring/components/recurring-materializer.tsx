import { useEffect, useRef } from 'react';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { useMaterializeRecurring } from '../hooks/use-recurring-templates';

/** Silently generates due recurring incomes/expenses when the household loads. */
export function RecurringMaterializer(): null {
  const householdId = useHouseholdStore((s) => s.activeHousehold?.id);
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const materialize = useMaterializeRecurring(householdId);
  const mutateRef = useRef(materialize.mutate);
  mutateRef.current = materialize.mutate;
  const lastRun = useRef<string | null>(null);

  useEffect(() => {
    if (initializing || !householdId || !user) return;
    if (lastRun.current === householdId) return;
    lastRun.current = householdId;
    mutateRef.current();
  }, [householdId, user, initializing]);

  return null;
}
