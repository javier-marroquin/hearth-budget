import { supabase } from '@/lib/supabase/client';
import type {
  ContributionRow,
  ContributionStatus,
} from '@/lib/supabase/aliases';
import type { ContributionInput } from '@/schemas/contribution.schema';

export interface ContributionFilters {
  householdId: string;
  from?: string;
  to?: string;
  status?: ContributionStatus;
  userId?: string;
}

export async function listContributions(
  filters: ContributionFilters,
): Promise<ContributionRow[]> {
  let q = supabase
    .from('contributions')
    .select('*')
    .eq('household_id', filters.householdId)
    .order('expected_date', { ascending: false });
  if (filters.from) q = q.gte('expected_date', filters.from);
  if (filters.to) q = q.lte('expected_date', filters.to);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.userId) q = q.eq('user_id', filters.userId);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export interface CreateContributionInput extends ContributionInput {
  household_id: string;
  created_by: string;
}

export async function createContribution(
  input: CreateContributionInput,
): Promise<ContributionRow> {
  const { data, error } = await supabase
    .from('contributions')
    .insert({
      household_id: input.household_id,
      user_id: input.user_id,
      amount: input.amount,
      currency: input.currency,
      expected_date: input.expected_date,
      received_date: input.received_date ?? null,
      status: input.status ?? (input.received_date ? 'received' : 'pending'),
      notes: input.notes ?? null,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to create contribution');
  return data;
}

export async function updateContribution(
  id: string,
  patch: Partial<ContributionInput>,
): Promise<ContributionRow> {
  const { data, error } = await supabase
    .from('contributions')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to update contribution');
  return data;
}

export async function markContributionReceived(
  id: string,
): Promise<ContributionRow> {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('contributions')
    .update({ status: 'received', received_date: today })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to mark received');
  return data;
}

export async function deleteContribution(id: string): Promise<void> {
  const { error } = await supabase.from('contributions').delete().eq('id', id);
  if (error) throw error;
}
