import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase/client';

/**
 * Subscribe to realtime changes on `calendar_events` for a household.
 * Invalidates calendar + kpis queries on any insert/update/delete so the
 * UI mirrors changes made by other household members.
 */
export function useRealtimeCalendarSync(householdId: string | null | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!householdId) return;
    const channel = supabase
      .channel(`calendar:${householdId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendar_events',
          filter: `household_id=eq.${householdId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ['calendar', householdId] });
          void qc.invalidateQueries({ queryKey: ['kpis', householdId] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [householdId, qc]);
}
