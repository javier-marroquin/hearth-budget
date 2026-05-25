import { supabase } from '@/lib/supabase/client';
import type {
  CategoryRow,
  CategoryType,
} from '@/lib/supabase/aliases';
import type { CategoryInput } from '@/schemas/category.schema';

export async function listCategories(
  householdId: string,
  type?: CategoryType,
): Promise<CategoryRow[]> {
  let query = supabase
    .from('categories')
    .select('*')
    .eq('household_id', householdId)
    .order('name');
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function createCategory(
  householdId: string,
  input: CategoryInput,
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from('categories')
    .insert({
      household_id: householdId,
      name: input.name,
      type: input.type,
      color: input.color,
      icon: input.icon,
      monthly_budget: input.monthly_budget ?? null,
      rollover_enabled: input.rollover_enabled ?? false,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create category');
  return data;
}

export async function updateCategory(
  id: string,
  patch: Partial<CategoryInput>,
): Promise<CategoryRow> {
  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to update category');
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}
