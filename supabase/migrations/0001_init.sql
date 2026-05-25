-- =============================================================================
-- 0001_init.sql
-- Schema base: profiles, households, household_members, audit_logs
-- =============================================================================

-- Extensions ------------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums -----------------------------------------------------------------------
do $$ begin
  create type household_role as enum ('admin', 'familiar', 'inquilino', 'invitado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_status as enum ('active', 'invited', 'removed');
exception when duplicate_object then null; end $$;

-- profiles --------------------------------------------------------------------
-- One row per auth.users record (1:1). Created automatically by trigger.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  default_household_id uuid,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Public profile data for each authenticated user.';

create index if not exists profiles_email_idx on public.profiles (email);

-- households ------------------------------------------------------------------
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  currency text not null default 'COP',
  timezone text not null default 'America/Bogota',
  envelope_mode_enabled boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.households is 'A household = a budget-sharing group (family / flatmates).';

create index if not exists households_owner_idx on public.households (owner_id);

-- household_members -----------------------------------------------------------
create table if not exists public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role household_role not null default 'familiar',
  share_percentage numeric(5, 2) check (share_percentage is null or (share_percentage >= 0 and share_percentage <= 100)),
  status member_status not null default 'active',
  invited_email text,
  invited_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  -- A user can only have ONE active membership row per household.
  constraint unique_active_member unique (household_id, user_id)
);
comment on table public.household_members is 'Mapping between users and households + their role.';

create index if not exists hm_household_idx on public.household_members (household_id);
create index if not exists hm_user_idx on public.household_members (user_id);
create index if not exists hm_status_idx on public.household_members (household_id, status);

-- audit_logs ------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  changes jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);
comment on table public.audit_logs is 'Immutable audit trail for every household mutation.';

create index if not exists audit_household_idx on public.audit_logs (household_id, created_at desc);
create index if not exists audit_user_idx on public.audit_logs (user_id, created_at desc);
create index if not exists audit_entity_idx on public.audit_logs (entity_type, entity_id);

-- Trigger to auto-create a profile when a new auth user signs up -------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url, locale)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'locale', 'es')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- updated_at maintenance helper ----------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists households_updated_at on public.households;
create trigger households_updated_at before update on public.households
  for each row execute procedure public.set_updated_at();

-- Helper: is_member_of -------------------------------------------------------
-- Returns true if the current authenticated user is an active member of the
-- given household. Used by RLS policies. SECURITY DEFINER so policies can
-- bypass nested RLS recursion on household_members.
create or replace function public.is_member_of(target_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.household_members
    where household_id = target_household_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.member_role(target_household_id uuid)
returns household_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.household_members
  where household_id = target_household_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_household_admin(target_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.member_role(target_household_id) = 'admin';
$$;

create or replace function public.is_writable_member(target_household_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.member_role(target_household_id) in ('admin', 'familiar', 'inquilino');
$$;
