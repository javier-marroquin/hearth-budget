import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listMyNotifications,
  markAllRead,
  markOneRead,
} from '../services/notifications.service';

export function useNotifications(householdId: string | null | undefined) {
  return useQuery({
    queryKey: ['notifications', householdId ?? 'none'],
    queryFn: () => listMyNotifications(householdId!),
    enabled: Boolean(householdId),
    refetchInterval: 60_000,
  });
}

export function useMarkAllRead(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => markAllRead(householdId),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications', householdId] });
    },
  });
}

export function useMarkOneRead(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markOneRead,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['notifications', householdId] });
    },
  });
}
