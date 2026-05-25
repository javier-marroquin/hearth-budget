import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/categories.service';
import type { CategoryType } from '@/lib/supabase/aliases';
import type { CategoryInput } from '@/schemas/category.schema';

const QK = {
  list: (householdId: string, type?: CategoryType) =>
    ['categories', householdId, type ?? 'all'] as const,
};

export function useCategories(householdId: string | null | undefined, type?: CategoryType) {
  return useQuery({
    queryKey: QK.list(householdId ?? 'none', type),
    queryFn: () => listCategories(householdId!, type),
    enabled: Boolean(householdId),
  });
}

export function useCreateCategory(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CategoryInput) => createCategory(householdId, input),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['categories', householdId] });
      toast.success('Categoría creada');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useUpdateCategory(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<CategoryInput> }) =>
      updateCategory(id, patch),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['categories', householdId] });
      toast.success('Categoría actualizada');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}

export function useDeleteCategory(householdId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['categories', householdId] });
      toast.success('Categoría eliminada');
    },
    onError: (err: Error) => toast.error(err.message),
  });
}
