import { useQuery } from '@tanstack/react-query';
import { fetchHouseholdKpis, type HouseholdKpis } from '../services/kpis.service';

export function useHouseholdKpis(
  householdId: string | null | undefined,
  referenceDate?: Date,
) {
  return useQuery<HouseholdKpis>({
    queryKey: [
      'kpis',
      householdId ?? 'none',
      referenceDate?.toISOString().slice(0, 7) ?? 'current',
    ],
    queryFn: () => fetchHouseholdKpis({ householdId: householdId!, referenceDate }),
    enabled: Boolean(householdId),
    staleTime: 1000 * 30,
  });
}
