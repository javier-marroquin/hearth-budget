import { supabase } from '@/lib/supabase/client';
import type { SavingsGoalRow } from '@/lib/supabase/database.types';

export async function listGoals(householdId: string): Promise<SavingsGoalRow[]> {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('household_id', householdId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface CreateGoalInput {
  household_id: string;
  name: string;
  target_amount: number;
  target_date?: string | null;
  category_id?: string | null;
  notes?: string | null;
  created_by: string;
}

export async function createGoal(input: CreateGoalInput): Promise<SavingsGoalRow> {
  const { data, error } = await supabase
    .from('savings_goals')
    .insert({
      household_id: input.household_id,
      name: input.name,
      target_amount: input.target_amount,
      target_date: input.target_date ?? null,
      category_id: input.category_id ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create goal');
  return data;
}

export async function updateGoal(
  id: string,
  patch: Partial<Omit<SavingsGoalRow, 'id' | 'created_at' | 'updated_at'>>,
): Promise<SavingsGoalRow> {
  const { data, error } = await supabase
    .from('savings_goals')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to update goal');
  return data;
}

export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('savings_goals').delete().eq('id', id);
  if (error) throw error;
}

export async function addToGoal(id: string, delta: number): Promise<SavingsGoalRow> {
  // Read-modify-write (simple; not transactional but acceptable here)
  const { data: current, error } = await supabase
    .from('savings_goals')
    .select('current_amount, target_amount')
    .eq('id', id)
    .single();
  if (error || !current) throw error ?? new Error('Goal not found');
  const next = Math.max(Number(current.current_amount) + delta, 0);
  const status =
    next >= Number(current.target_amount) ? 'completed' : 'active';
  return updateGoal(id, { current_amount: next, status });
}
