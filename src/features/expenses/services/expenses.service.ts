import { apiFetch } from '@/lib/api/client';
import type {
  ExpenseRow,
  ExpenseSplitRow,
  PaymentStatus,
  SplitMethod,
} from '@/lib/db/aliases';
import type { ExpenseInput } from '@/schemas/expense.schema';
import type { SplitParticipant } from '@/lib/finance/splits';

export interface ExpenseFilters {
  householdId: string;
  from?: string;
  to?: string;
  status?: PaymentStatus;
  categoryId?: string;
  type?: ExpenseRow['type'];
}

function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export async function listExpenses(filters: ExpenseFilters): Promise<ExpenseRow[]> {
  return apiFetch(
    `/api/households/${filters.householdId}/expenses${queryString({
      from: filters.from,
      to: filters.to,
      status: filters.status,
      categoryId: filters.categoryId,
      type: filters.type,
    })}`,
  );
}

export async function getExpenseSplits(expenseId: string): Promise<ExpenseSplitRow[]> {
  return apiFetch(`/api/expenses/${expenseId}/splits`);
}

export interface CreateExpenseInput extends ExpenseInput {
  household_id: string;
  created_by: string;
  split: {
    method: SplitMethod;
    participants: SplitParticipant[];
  };
}

/** Create an expense plus matching expense_splits rows (transactional on server). */
export async function createExpense(input: CreateExpenseInput): Promise<ExpenseRow> {
  const { household_id, created_by: _createdBy, split, ...body } = input;
  return apiFetch(`/api/households/${household_id}/expenses`, {
    method: 'POST',
    body: JSON.stringify({ ...body, split }),
  });
}

export async function updateExpense(
  id: string,
  patch: Partial<ExpenseInput>,
): Promise<ExpenseRow> {
  return apiFetch(`/api/expenses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteExpense(id: string): Promise<void> {
  await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' });
}

export async function markExpensePaid(
  id: string,
  _paidBy: string,
): Promise<ExpenseRow> {
  return apiFetch(`/api/expenses/${id}/mark-paid`, { method: 'POST' });
}
