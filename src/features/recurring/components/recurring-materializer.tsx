import { useEffect, useRef } from 'react';
import { useHouseholdStore } from '@/features/households/stores/household.store';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import { materializeRecurringTemplates } from '../services/recurring-templates.service';

let materializeInFlight: string | null = null;

/** Generates due recurring incomes/expenses once per household session (debounced). */
export function RecurringMaterializer(): null {
  const householdId = useHouseholdStore((s) => s.activeHousehold?.id);
  const user = useAuthStore((s) => s.user);
  const initializing = useAuthStore((s) => s.initializing);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ranFor = useRef<string | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (initializing || !householdId || !user) return;
    if (ranFor.current === householdId) return;

    timerRef.current = setTimeout(() => {
      if (materializeInFlight === householdId) return;
      materializeInFlight = householdId;
      ranFor.current = householdId;

      void materializeRecurringTemplates(householdId, user.id)
        .catch((err) => console.warn('[recurring] background sync', err))
        .finally(() => {
          if (materializeInFlight === householdId) materializeInFlight = null;
        });
    }, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [householdId, user, initializing]);

  return null;
}
