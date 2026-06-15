-- =============================================================================
-- 0002_rls_policies.sql
-- Row Level Security policies for profiles, households, household_members,
-- audit_logs.
--
-- Roles:
--   admin     -> full control (members, household settings, all data)
--   familiar  -> read/write data, no member management
--   inquilino -> read/write data (mostly own), no member management
--   invitado  -> read-only
-- =============================================================================

-- Enable RLS ------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.audit_logs enable row level security;

-- profiles --------------------------------------------------------------------
-- Anyone authenticated can read their own profile.
-- Members of the same household can see basic profile info of co-members.
drop policy if exists "Profiles: read own" on public.profiles;
create policy "Profiles: read own"
  on public.profiles for select
  using (id = auth.uid());

drop policy if exists "Profiles: read co-members" on public.profiles;
create policy "Profiles: read co-members"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.household_members hm_self
      join public.household_members hm_other
        on hm_other.household_id = hm_self.household_id
      where hm_self.user_id = auth.uid()
        and hm_self.status = 'active'
        and hm_other.user_id = profiles.id
        and hm_other.status = 'active'
    )
  );

drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- households ------------------------------------------------------------------
drop policy if exists "Households: read if member" on public.households;
create policy "Households: read if member"
  on public.households for select
  using (public.is_member_of(id));

drop policy if exists "Households: insert own" on public.households;
create policy "Households: insert own"
  on public.households for insert
  with check (owner_id = auth.uid());

drop policy if exists "Households: update if admin" on public.households;
create policy "Households: update if admin"
  on public.households for update
  using (public.is_household_admin(id))
  with check (public.is_household_admin(id));

drop policy if exists "Households: delete if owner" on public.households;
create policy "Households: delete if owner"
  on public.households for delete
  using (owner_id = auth.uid());

-- household_members -----------------------------------------------------------
-- Read: any active member of the household can see the full member list.
-- Self-read: also allow reading rows where user_id = auth.uid() (so on
-- bootstrap, before policies kick in, we can find our own memberships).
drop policy if exists "Members: read same household" on public.household_members;
create policy "Members: read same household"
  on public.household_members for select
  using (
    user_id = auth.uid()
    or public.is_member_of(household_id)
  );

-- Insert: a household owner can insert themselves as admin (bootstrap).
-- An admin can insert pending invitations.
drop policy if exists "Members: bootstrap owner" on public.household_members;
create policy "Members: bootstrap owner"
  on public.household_members for insert
  with check (
    user_id = auth.uid()
    and role = 'admin'
    and status = 'active'
    and exists (
      select 1 from public.households h
      where h.id = household_id and h.owner_id = auth.uid()
    )
  );

drop policy if exists "Members: admin can invite" on public.household_members;
create policy "Members: admin can invite"
  on public.household_members for insert
  with check (
    public.is_household_admin(household_id)
    and status = 'invited'
  );

-- Update: admin can change roles / remove members. A user can update their own
-- row to accept an invitation (status invited -> active).
drop policy if exists "Members: admin can update" on public.household_members;
create policy "Members: admin can update"
  on public.household_members for update
  using (public.is_household_admin(household_id))
  with check (public.is_household_admin(household_id));

drop policy if exists "Members: self accept invite" on public.household_members;
create policy "Members: self accept invite"
  on public.household_members for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Delete: only admin (and not the last admin).
drop policy if exists "Members: admin can remove" on public.household_members;
create policy "Members: admin can remove"
  on public.household_members for delete
  using (public.is_household_admin(household_id));

-- audit_logs ------------------------------------------------------------------
-- Read: any active member can read the household audit log.
drop policy if exists "AuditLogs: read if member" on public.audit_logs;
create policy "AuditLogs: read if member"
  on public.audit_logs for select
  using (household_id is null or public.is_member_of(household_id));

-- Writes go through the service role (Netlify Functions / triggers).
-- We deliberately do NOT allow inserts from anon/authenticated.
