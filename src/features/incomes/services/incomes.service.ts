import { supabase } from '@/lib/supabase/client';
import type { IncomeRow } from '@/lib/supabase/database.types';
import type { IncomeInput } from '@/schemas/income.schema';

export interface IncomeFilters {
  householdId: string;
  from?: string;
  to?: string;
  userId?: string;
  categoryId?: string;
}

export async function listIncomes(filters: IncomeFilters): Promise<IncomeRow[]> {
  let q = supabase
    .from('incomes')
    .select('*')
    .eq('household_id', filters.householdId)
    .order('date', { ascending: false });
  if (filters.from) q = q.gte('date', filters.from);
  if (filters.to) q = q.lte('date', filters.to);
  if (filters.userId) q = q.eq('user_id', filters.userId);
  if (filters.categoryId) q = q.eq('category_id', filters.categoryId);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export interface CreateIncomeInput extends IncomeInput {
  household_id: string;
  created_by: string;
}

export async function createIncome(input: CreateIncomeInput): Promise<IncomeRow> {
  const { data, error } = await supabase
    .from('incomes')
    .insert({
      household_id: input.household_id,
      user_id: input.user_id,
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      category_id: input.category_id ?? null,
      source: input.source ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create income');
  return data;
}

export async function updateIncome(
  id: string,
  patch: Partial<IncomeInput>,
): Promise<IncomeRow> {
  const { data, error } = await supabase
    .from('incomes')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to update income');
  return data;
}

export async function deleteIncome(id: string): Promise<void> {
  const { error } = await supabase.from('incomes').delete().eq('id', id);
  if (error) throw error;
}
