import { apiFetch } from '@/lib/api/client';
import type { SavingsGoalRow } from '@/lib/db/aliases';

export async function listGoals(householdId: string): Promise<SavingsGoalRow[]> {
  return apiFetch(`/api/households/${householdId}/goals`);
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
  const { household_id, created_by: _createdBy, ...body } = input;
  return apiFetch(`/api/households/${household_id}/goals`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateGoal(
  id: string,
  patch: Partial<Omit<SavingsGoalRow, 'id' | 'created_at' | 'updated_at'>>,
): Promise<SavingsGoalRow> {
  return apiFetch(`/api/goals/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteGoal(id: string): Promise<void> {
  await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
}

export async function addToGoal(id: string, delta: number): Promise<SavingsGoalRow> {
  return apiFetch(`/api/goals/${id}/add`, {
    method: 'POST',
    body: JSON.stringify({ delta }),
  });
}
