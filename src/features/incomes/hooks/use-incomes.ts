import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import i18n from '@/i18n';
import {
  createIncome,
  deleteIncome,
  listIncomes,
  updateIncome,
  type CreateIncomeInput,
  type IncomeFilters,
} from '../services/incomes.service';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import type { IncomeInput } from '@/schemas/income.schema';

const QK = {
  list: (filters: IncomeFilters) =>
    ['incomes', filters.householdId, filters] as const,
};

export function useIncomes(filters: IncomeFilters | null) {
  return useQuery({
    queryKey: QK.list(filters ?? { householdId: 'none' }),
    queryFn: () => listIncomes(filters!),
    enabled: Boolean(filters?.householdId),
  });
}

export function useCreateIncome(householdId: string) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (input: IncomeInput) => {
      if (!user) throw new Error('Not authenticated');
      const payload: CreateIncomeInput = {
        ...input,
        household_id: householdId,
        created_by: user.id,
      };
      return createIncome(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['incomes', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      toast.success(i18n.t('toast.income_created'));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateIncome(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<IncomeInput> }) =>
      updateIncome(id, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['incomes', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      toast.success(i18n.t('toast.income_updated'));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteIncome(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteIncome,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['incomes', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      toast.success(i18n.t('toast.income_deleted'));
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
