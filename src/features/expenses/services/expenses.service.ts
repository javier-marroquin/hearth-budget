import { supabase } from '@/lib/supabase/client';
import type {
  ExpenseRow,
  ExpenseSplitRow,
  PaymentStatus,
  SplitMethod,
} from '@/lib/supabase/aliases';
import type { ExpenseInput } from '@/schemas/expense.schema';
import { splitExpense, type SplitParticipant } from '@/lib/finance/splits';

export interface ExpenseFilters {
  householdId: string;
  from?: string;
  to?: string;
  status?: PaymentStatus;
  categoryId?: string;
  type?: ExpenseRow['type'];
}

export async function listExpenses(filters: ExpenseFilters): Promise<ExpenseRow[]> {
  let q = supabase
    .from('expenses')
    .select('*')
    .eq('household_id', filters.householdId)
    .order('date', { ascending: false });
  if (filters.from) q = q.gte('date', filters.from);
  if (filters.to) q = q.lte('date', filters.to);
  if (filters.status) q = q.eq('status', filters.status);
  if (filters.categoryId) q = q.eq('category_id', filters.categoryId);
  if (filters.type) q = q.eq('type', filters.type);
  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function getExpenseSplits(expenseId: string): Promise<ExpenseSplitRow[]> {
  const { data, error } = await supabase
    .from('expense_splits')
    .select('*')
    .eq('expense_id', expenseId);
  if (error) throw error;
  return data ?? [];
}

export interface CreateExpenseInput extends ExpenseInput {
  household_id: string;
  created_by: string;
  split: {
    method: SplitMethod;
    participants: SplitParticipant[];
  };
}

/**
 * Create an expense plus the matching expense_splits rows.
 * NOTE: not transactional because Supabase JS doesn't expose explicit
 * transactions — we rollback the parent row on split failure.
 */
export async function createExpense(input: CreateExpenseInput): Promise<ExpenseRow> {
  const { data: expense, error } = await supabase
    .from('expenses')
    .insert({
      household_id: input.household_id,
      amount: input.amount,
      currency: input.currency,
      date: input.date,
      due_date: input.due_date ?? null,
      category_id: input.category_id ?? null,
      type: input.type,
      status: input.status ?? 'pending',
      split_method: input.split.method,
      description: input.description ?? null,
      notes: input.notes ?? null,
      created_by: input.created_by,
    })
    .select()
    .single();
  if (error || !expense) throw error ?? new Error('Failed to create expense');

  if (input.split.participants.length > 0) {
    const splits = splitExpense(input.amount, input.split.participants, input.split.method);
    const { error: splitError } = await supabase.from('expense_splits').insert(
      splits.map((s) => ({
        expense_id: expense.id,
        user_id: s.userId,
        amount: s.amount,
        percentage: s.percentage,
      })),
    );
    if (splitError) {
      // rollback parent expense
      await supabase.from('expenses').delete().eq('id', expense.id);
      throw splitError;
    }
  }

  return expense;
}

export async function updateExpense(
  id: string,
  patch: Partial<ExpenseInput>,
): Promise<ExpenseRow> {
  const { data, error } = await supabase
    .from('expenses')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to update expense');
  return data;
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
}

export async function markExpensePaid(
  id: string,
  paidBy: string,
): Promise<ExpenseRow> {
  const { data, error } = await supabase
    .from('expenses')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: paidBy,
    })
    .eq('id', id)
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Failed to mark paid');
  return data;
}
