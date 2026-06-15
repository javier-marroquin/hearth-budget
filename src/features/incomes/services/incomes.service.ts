import { apiFetch } from '@/lib/api/client';
import type { IncomeRow } from '@/lib/db/aliases';
import type { IncomeInput } from '@/schemas/income.schema';

export interface IncomeFilters {
  householdId: string;
  from?: string;
  to?: string;
  userId?: string;
  categoryId?: string;
}

function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export async function listIncomes(filters: IncomeFilters): Promise<IncomeRow[]> {
  return apiFetch(
    `/api/households/${filters.householdId}/incomes${queryString({
      from: filters.from,
      to: filters.to,
      userId: filters.userId,
      categoryId: filters.categoryId,
    })}`,
  );
}

export interface CreateIncomeInput extends IncomeInput {
  household_id: string;
  created_by: string;
}

export async function createIncome(input: CreateIncomeInput): Promise<IncomeRow> {
  const { household_id, created_by: _createdBy, ...body } = input;
  return apiFetch(`/api/households/${household_id}/incomes`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateIncome(
  id: string,
  patch: Partial<IncomeInput>,
): Promise<IncomeRow> {
  return apiFetch(`/api/incomes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteIncome(id: string): Promise<void> {
  await apiFetch(`/api/incomes/${id}`, { method: 'DELETE' });
}
