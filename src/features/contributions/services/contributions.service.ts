import { apiFetch } from '@/lib/api/client';
import type { ContributionRow, ContributionStatus } from '@/lib/db/aliases';
import type { ContributionInput } from '@/schemas/contribution.schema';

export interface ContributionFilters {
  householdId: string;
  from?: string;
  to?: string;
  status?: ContributionStatus;
  userId?: string;
}

function queryString(params: Record<string, string | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) qs.set(key, value);
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export async function listContributions(
  filters: ContributionFilters,
): Promise<ContributionRow[]> {
  return apiFetch(
    `/api/households/${filters.householdId}/contributions${queryString({
      from: filters.from,
      to: filters.to,
      status: filters.status,
      userId: filters.userId,
    })}`,
  );
}

export interface CreateContributionInput extends ContributionInput {
  household_id: string;
  created_by: string;
}

export async function createContribution(
  input: CreateContributionInput,
): Promise<ContributionRow> {
  const { household_id, created_by: _createdBy, ...body } = input;
  return apiFetch(`/api/households/${household_id}/contributions`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updateContribution(
  id: string,
  patch: Partial<ContributionInput>,
): Promise<ContributionRow> {
  return apiFetch(`/api/contributions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function markContributionReceived(
  id: string,
): Promise<ContributionRow> {
  return apiFetch(`/api/contributions/${id}/mark-received`, { method: 'POST' });
}

export async function deleteContribution(id: string): Promise<void> {
  await apiFetch(`/api/contributions/${id}`, { method: 'DELETE' });
}
