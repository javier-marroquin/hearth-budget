import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import {
  addToGoal,
  createGoal,
  deleteGoal,
  listGoals,
  updateGoal,
  type CreateGoalInput,
} from '../services/goals.service';
import type { SavingsGoalRow } from '@/lib/db/aliases';

const QK = {
  list: (householdId: string) => ['goals', householdId] as const,
};

export function useGoals(householdId: string | null | undefined) {
  return useQuery({
    queryKey: QK.list(householdId ?? 'none'),
    queryFn: () => listGoals(householdId!),
    enabled: Boolean(householdId),
  });
}

export function useCreateGoal(householdId: string) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (input: Omit<CreateGoalInput, 'household_id' | 'created_by'>) => {
      if (!user) throw new Error('Not authenticated');
      return createGoal({ ...input, household_id: householdId, created_by: user.id });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['goals', householdId] });
      toast.success('Meta creada');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateGoal(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<SavingsGoalRow>;
    }) => updateGoal(id, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['goals', householdId] });
      toast.success('Meta actualizada');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useAddToGoal(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) => addToGoal(id, delta),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['goals', householdId] });
      toast.success('Saldo actualizado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteGoal(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteGoal,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['goals', householdId] });
      toast.success('Meta eliminada');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
