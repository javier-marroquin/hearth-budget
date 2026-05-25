import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import type { RecurringTemplateInput } from '@/schemas/recurring.schema';
import {
  createRecurringTemplate,
  deleteRecurringTemplate,
  listRecurringTemplates,
  materializeRecurringTemplates,
  setRecurringTemplateActive,
} from '../services/recurring-templates.service';

const qk = (householdId: string) => ['recurring-templates', householdId] as const;

export function useRecurringTemplates(householdId: string | undefined) {
  return useQuery({
    queryKey: householdId ? qk(householdId) : ['recurring-templates', 'none'],
    queryFn: () => listRecurringTemplates(householdId!),
    enabled: Boolean(householdId),
  });
}

export function useMaterializeRecurring(householdId: string | undefined) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async () => {
      if (!householdId || !user) return { created: 0 };
      return materializeRecurringTemplates(householdId, user.id);
    },
    onSuccess: async (result) => {
      if (!householdId) return;
      await qc.invalidateQueries({ queryKey: qk(householdId) });
      await qc.invalidateQueries({ queryKey: ['incomes', householdId] });
      await qc.invalidateQueries({ queryKey: ['expenses', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      if (result.created > 0) {
        toast.success(`${result.created} movimiento(s) generado(s)`);
      }
    },
  });
}

export function useCreateRecurringTemplate(householdId: string, currency: string) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (input: RecurringTemplateInput) => {
      if (!user) throw new Error('Not authenticated');
      return createRecurringTemplate(householdId, user.id, input, currency);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk(householdId) });
      await qc.invalidateQueries({ queryKey: ['incomes', householdId] });
      await qc.invalidateQueries({ queryKey: ['expenses', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      toast.success(t('recurring.created'));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useToggleRecurringTemplate(householdId: string) {
  const qc = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      setRecurringTemplateActive(id, active),
    onSuccess: async (_data, vars) => {
      await qc.invalidateQueries({ queryKey: qk(householdId) });
      toast.success(vars.active ? t('recurring.resumed') : t('recurring.paused'));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteRecurringTemplate(householdId: string) {
  const qc = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: string) => deleteRecurringTemplate(id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: qk(householdId) });
      toast.success(t('recurring.deleted'));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
