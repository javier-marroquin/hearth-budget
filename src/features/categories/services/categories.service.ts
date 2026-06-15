import { apiFetch } from '@/lib/api/client';
import type { CategoryRow, CategoryType } from '@/lib/db/aliases';
import type { CategoryInput } from '@/schemas/category.schema';

function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export async function listCategories(
  householdId: string,
  type?: CategoryType,
): Promise<CategoryRow[]> {
  return apiFetch(
    `/api/households/${householdId}/categories${queryString({ type })}`,
  );
}

export async function createCategory(
  householdId: string,
  input: CategoryInput,
): Promise<CategoryRow> {
  return apiFetch(`/api/households/${householdId}/categories`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateCategory(
  id: string,
  patch: Partial<CategoryInput>,
): Promise<CategoryRow> {
  return apiFetch(`/api/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function deleteCategory(id: string): Promise<void> {
  await apiFetch(`/api/categories/${id}`, { method: 'DELETE' });
}
