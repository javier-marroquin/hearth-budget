import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createContribution,
  deleteContribution,
  listContributions,
  markContributionReceived,
  updateContribution,
  type ContributionFilters,
  type CreateContributionInput,
} from '../services/contributions.service';
import { useAuthStore } from '@/features/auth/stores/auth.store';
import type { ContributionInput } from '@/schemas/contribution.schema';

const QK = {
  list: (filters: ContributionFilters) =>
    ['contributions', filters.householdId, filters] as const,
};

export function useContributions(filters: ContributionFilters | null) {
  return useQuery({
    queryKey: QK.list(filters ?? { householdId: 'none' }),
    queryFn: () => listContributions(filters!),
    enabled: Boolean(filters?.householdId),
  });
}

export function useCreateContribution(householdId: string) {
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  return useMutation({
    mutationFn: (input: ContributionInput) => {
      if (!user) throw new Error('Not authenticated');
      const payload: CreateContributionInput = {
        ...input,
        household_id: householdId,
        created_by: user.id,
      };
      return createContribution(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contributions', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      toast.success('Aporte registrado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateContribution(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<ContributionInput> }) =>
      updateContribution(id, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contributions', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      toast.success('Aporte actualizado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useMarkContributionReceived(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markContributionReceived,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contributions', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      toast.success('Aporte marcado como recibido');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteContribution(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteContribution,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['contributions', householdId] });
      await qc.invalidateQueries({ queryKey: ['kpis', householdId] });
      toast.success('Aporte eliminado');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
