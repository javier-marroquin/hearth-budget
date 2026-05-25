import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createExpense,
  deleteExpense,
  getExpenseSplits,
  listExpenses,
  markExpensePaid,
  updateExpense,
  type CreateExpenseInput,
  type ExpenseFilters,
} from '../services/expenses.service';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import type { ExpenseInput } from '@/schemas/expense.schema';
import type { SplitMethod } from '@/lib/supabase/aliases';
import type { SplitParticipant } from '@/lib/finance/splits';

const QK = {
  list: (filters: ExpenseFilters) =>
    ['expenses', filters.householdId, filters] as const,
  splits: (expenseId: string) => ['expenses', 'splits', expenseId] as const,
};

export function useExpenses(filters: ExpenseFilters | null) {
  return useQuery({
    queryKey: QK.list(filters ?? { householdId: 'none' }),
    queryFn: () => listExpenses(filters!),
    enabled: Boolean(filters?.householdId),
  });
}

export function useExpenseSplits(expenseId: string | null | undefined) {
  return useQuery({
    queryKey: QK.splits(expenseId ?? 'none'),
    queryFn: () => getExpenseSplits(expenseId!),
    enabled: Boolean(expenseId),
  });
}

export function useCreateExpense(householdId: string) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (args: {
      input: ExpenseInput;
      split: { method: SplitMethod; participants: SplitParticipant[] };
    }) => {
      if (!user) throw new Error('Not authenticated');
      const payload: CreateExpenseInput = {
        ...args.input,
        household_id: householdId,
        created_by: user.id,
        split: args.split,
      };
      return createExpense(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['expenses', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      toast.success('Gasto registrado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateExpense(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ExpenseInput> }) =>
      updateExpense(id, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['expenses', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      toast.success('Gasto actualizado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteExpense(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteExpense,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['expenses', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      toast.success('Gasto eliminado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMarkExpensePaid(householdId: string) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (id: string) => {
      if (!user) throw new Error('Not authenticated');
      return markExpensePaid(id, user.id);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['expenses', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      await qc.invalidateQueries({ queryKey: ['upcoming', householdId] });
      toast.success('Marcado como pagado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
