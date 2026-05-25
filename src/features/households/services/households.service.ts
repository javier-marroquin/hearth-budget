import { supabase } from '@/lib/supabase/client';
import type { Household, HouseholdMembership } from '../stores/household.store';
import type { ProfileRow, HouseholdMemberRow } from '@/lib/supabase/aliases';

export interface CreateHouseholdInput {
  name: string;
  currency: string;
  timezone: string;
  ownerId: string;
}

/**
 * Creates a household + the bootstrap admin membership.
 */
export async function createHousehold(input: CreateHouseholdInput): Promise<Household> {
  // Pre-generate id so we can bootstrap membership before SELECT (RLS: read if member).
  const householdId = crypto.randomUUID();

  const { error: hhError } = await supabase.from('households').insert({
    id: householdId,
    name: input.name,
    currency: input.currency,
    timezone: input.timezone,
    owner_id: input.ownerId,
  });

  if (hhError) throw hhError;

  const { error: memberError } = await supabase.from('household_members').insert({
    household_id: householdId,
    user_id: input.ownerId,
    role: 'admin',
    status: 'active',
    joined_at: new Date().toISOString(),
  });

  if (memberError) throw memberError;

  const { data: household, error: fetchError } = await supabase
    .from('households')
    .select('id, name, currency, timezone, envelope_mode_enabled')
    .eq('id', householdId)
    .single();

  if (fetchError || !household) throw fetchError ?? new Error('Failed to create household');

  // Best-effort: also set as default_household_id on profile.
  await supabase
    .from('profiles')
    .update({ default_household_id: household.id })
    .eq('id', input.ownerId);

  return {
    id: household.id,
    name: household.name,
    currency: household.currency,
    timezone: household.timezone,
    envelope_mode_enabled: household.envelope_mode_enabled ?? false,
  };
}

/** Fetch all households the current user belongs to (active). */
export async function listMyHouseholds(): Promise<
  Array<{ household: Household; membership: HouseholdMembership }>
> {
  const { data: memberships, error } = await supabase
    .from('household_members')
    .select('household_id, user_id, role, share_percentage, status')
    .eq('status', 'active');

  if (error) throw error;
  if (!memberships || memberships.length === 0) return [];

  const householdIds = memberships
    .map((m) => m.household_id)
    .filter((id): id is string => Boolean(id));

  const { data: households, error: hhErr } = await supabase
    .from('households')
    .select('id, name, currency, timezone, envelope_mode_enabled')
    .in('id', householdIds);

  if (hhErr) throw hhErr;
  if (!households) return [];

  const byId = new Map(households.map((h) => [h.id, h]));

  const results: Array<{ household: Household; membership: HouseholdMembership }> = [];
  for (const row of memberships) {
    const h = byId.get(row.household_id);
    if (!h) continue;
    results.push({
      household: {
        id: h.id,
        name: h.name,
        currency: h.currency,
        timezone: h.timezone,
        envelope_mode_enabled: h.envelope_mode_enabled ?? false,
      },
      membership: {
        household_id: row.household_id,
        user_id: row.user_id ?? '',
        role: row.role,
        share_percentage: row.share_percentage,
        status: row.status,
      },
    });
  }
  return results;
}

export interface MemberWithProfile extends HouseholdMemberRow {
  profile: Pick<ProfileRow, 'id' | 'email' | 'full_name' | 'avatar_url'> | null;
}

/** List members (active + invited) of a household. */
export async function listMembers(householdId: string): Promise<MemberWithProfile[]> {
  const { data: members, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', householdId)
    .neq('status', 'removed')
    .order('created_at', { ascending: true });

  if (error) throw error;
  if (!members) return [];

  const userIds = members
    .map((m) => m.user_id)
    .filter((id): id is string => Boolean(id));

  let profilesById = new Map<string, MemberWithProfile['profile']>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url')
      .in('id', userIds);
    if (profiles) {
      profilesById = new Map(profiles.map((p) => [p.id, p]));
    }
  }

  return members.map((m) => ({
    ...m,
    profile: m.user_id ? (profilesById.get(m.user_id) ?? null) : null,
  }));
}
