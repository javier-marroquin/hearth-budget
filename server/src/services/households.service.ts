import type { DbClient } from '../db/pool.js';

export interface HouseholdDto {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  envelope_mode_enabled: boolean;
}

export async function createHousehold(
  client: DbClient,
  ownerId: string,
  input: { name: string; currency: string; timezone: string },
): Promise<HouseholdDto> {
  const householdId = crypto.randomUUID();

  await client.query(
    `INSERT INTO public.households (id, name, currency, timezone, owner_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [householdId, input.name, input.currency, input.timezone, ownerId],
  );

  await client.query(
    `INSERT INTO public.household_members
       (household_id, user_id, role, status, joined_at)
     VALUES ($1, $2, 'admin', 'active', now())`,
    [householdId, ownerId],
  );

  const { rows } = await client.query<HouseholdDto>(
    `SELECT id, name, currency, timezone, envelope_mode_enabled
     FROM public.households WHERE id = $1`,
    [householdId],
  );

  await client.query(
    `UPDATE public.profiles SET default_household_id = $1 WHERE id = $2`,
    [householdId, ownerId],
  );

  return rows[0]!;
}

export async function listMyHouseholds(
  client: DbClient,
  userId: string,
): Promise<
  Array<{
    household: HouseholdDto;
    membership: {
      household_id: string;
      user_id: string;
      role: string;
      share_percentage: number | null;
      status: string;
    };
  }>
> {
  const { rows: memberships } = await client.query<{
    household_id: string;
    user_id: string;
    role: string;
    share_percentage: number | null;
    status: string;
  }>(
    `SELECT household_id, user_id, role, share_percentage, status
     FROM public.household_members
     WHERE user_id = $1 AND status = 'active'`,
    [userId],
  );

  if (memberships.length === 0) return [];

  const ids = memberships.map((m) => m.household_id);
  const { rows: households } = await client.query<HouseholdDto>(
    `SELECT id, name, currency, timezone, envelope_mode_enabled
     FROM public.households WHERE id = ANY($1::uuid[])`,
    [ids],
  );

  const byId = new Map(households.map((h) => [h.id, h]));
  return memberships
    .map((m) => {
      const h = byId.get(m.household_id);
      if (!h) return null;
      return { household: h, membership: m };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

export async function listMembers(client: DbClient, householdId: string) {
  const { rows: members } = await client.query(
    `SELECT * FROM public.household_members
     WHERE household_id = $1 AND status != 'removed'
     ORDER BY created_at ASC`,
    [householdId],
  );

  const userIds = members
    .map((m: { user_id: string | null }) => m.user_id)
    .filter((id): id is string => Boolean(id));

  let profiles: Array<{
    id: string;
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  }> = [];

  if (userIds.length > 0) {
    const { rows } = await client.query(
      `SELECT id, email, full_name, avatar_url FROM public.profiles
       WHERE id = ANY($1::uuid[])`,
      [userIds],
    );
    profiles = rows;
  }

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  return members.map((m: { user_id: string | null }) => ({
    ...m,
    profile: m.user_id ? (profileMap.get(m.user_id) ?? null) : null,
  }));
}

export async function updateProfile(
  client: DbClient,
  userId: string,
  fullName: string,
) {
  const name = fullName.trim();
  await client.query(
    `UPDATE public.profiles SET full_name = $1, updated_at = now() WHERE id = $2`,
    [name, userId],
  );
  return { id: userId, full_name: name };
}
