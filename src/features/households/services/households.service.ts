import { apiFetch } from '@/lib/api/client';
import type { ProfileRow, HouseholdMemberRow } from '@/lib/db/aliases';
import type { Household, HouseholdMembership } from '../stores/household.store';

export interface CreateHouseholdInput {
  name: string;
  currency: string;
  timezone: string;
  /** @deprecated Server uses session user; omit from API call. */
  ownerId?: string;
}

/** Creates a household + the bootstrap admin membership. */
export async function createHousehold(input: CreateHouseholdInput): Promise<Household> {
  return apiFetch<Household>('/api/households', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      currency: input.currency,
      timezone: input.timezone,
    }),
  });
}

/** Fetch all households the current user belongs to (active). */
export async function listMyHouseholds(): Promise<
  Array<{ household: Household; membership: HouseholdMembership }>
> {
  return apiFetch('/api/households');
}

export interface MemberWithProfile extends HouseholdMemberRow {
  profile: Pick<ProfileRow, 'id' | 'email' | 'full_name' | 'avatar_url'> | null;
}

/** List members (active + invited) of a household. */
export async function listMembers(householdId: string): Promise<MemberWithProfile[]> {
  return apiFetch(`/api/households/${householdId}/members`);
}
