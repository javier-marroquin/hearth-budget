import { useQuery } from '@tanstack/react-query';
import { fetchUpcoming, type UpcomingResult } from '../services/upcoming.service';

export function useUpcoming(
  householdId: string | null | undefined,
  windowDays = 14,
) {
  return useQuery<UpcomingResult>({
    queryKey: ['upcoming', householdId ?? 'none', windowDays],
    queryFn: () =>
      fetchUpcoming({ householdId: householdId!, windowDays }),
    enabled: Boolean(householdId),
    staleTime: 1000 * 30,
  });
}
