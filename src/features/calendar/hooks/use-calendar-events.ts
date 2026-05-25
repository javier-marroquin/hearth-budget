import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listCalendarEvents,
  updateCalendarEvent,
  type CalendarEventFilters,
  type CreateCalendarEventInput,
} from '../services/calendar.service';

const QK = {
  list: (filters: CalendarEventFilters) =>
    ['calendar', filters.householdId, filters] as const,
};

export function useCalendarEvents(filters: CalendarEventFilters | null) {
  return useQuery({
    queryKey: QK.list(filters ?? { householdId: 'none' }),
    queryFn: () => listCalendarEvents(filters!),
    enabled: Boolean(filters?.householdId),
  });
}

export function useCreateCalendarEvent(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['calendar', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      toast.success('Evento creado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCalendarEvent(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<CreateCalendarEventInput>;
    }) => updateCalendarEvent(id, patch),
    // Optimistic update for drag&drop
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['calendar', householdId] });
      const all = qc.getQueriesData({ queryKey: ['calendar', householdId] });
      const snapshots = all.map(([key, data]) => ({ key, data }));
      for (const [key, data] of all) {
        if (!Array.isArray(data)) continue;
        qc.setQueryData(
          key,
          data.map((ev) =>
            ev.id === id ? { ...ev, ...patch } : ev,
          ),
        );
      }
      return { snapshots };
    },
    onError: (err: Error, _vars, ctx) => {
      toast.error(err.message);
      if (ctx?.snapshots) {
        for (const { key, data } of ctx.snapshots) {
          qc.setQueryData(key, data);
        }
      }
    },
    onSettled: async () => {
      await qc.invalidateQueries({ queryKey: ['calendar', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
    },
  });
}

export function useDeleteCalendarEvent(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCalendarEvent,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['calendar', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      toast.success('Evento eliminado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
