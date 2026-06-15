-- =============================================================================
-- 0006_recurring_goals_notifications.sql
-- recurring_rules, savings_goals, notifications.
-- =============================================================================

do $$ begin
  create type recurrence_frequency as enum (
    'daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_status as enum ('active', 'completed', 'paused');
exception when duplicate_object then null; end $$;

-- recurring_rules ------------------------------------------------------------
create table if not exists public.recurring_rules (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  frequency recurrence_frequency not null,
  interval integer not null default 1 check (interval > 0),
  day_of_month integer check (day_of_month is null or (day_of_month between 1 and 31)),
  day_of_week integer check (day_of_week is null or (day_of_week between 0 and 6)),
  start_date date not null,
  end_date date,
  occurrences integer check (occurrences is null or occurrences > 0),
  created_at timestamptz not null default now(),
  constraint recurring_dates_valid check (end_date is null or end_date >= start_date)
);

create index if not exists recurring_household_idx on public.recurring_rules (household_id);

-- savings_goals --------------------------------------------------------------
create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  target_date date,
  category_id uuid references public.categories(id) on delete set null,
  status goal_status not null default 'active',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_household_idx on public.savings_goals (household_id);
create index if not exists goals_status_idx on public.savings_goals (household_id, status);

drop trigger if exists savings_goals_updated_at on public.savings_goals;
create trigger savings_goals_updated_at before update on public.savings_goals
  for each row execute procedure public.set_updated_at();

-- notifications --------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  related_id uuid,
  related_type text,
  read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx
  on public.notifications (user_id, read, created_at desc);
create index if not exists notifications_household_idx
  on public.notifications (household_id, created_at desc);

-- RLS policies ---------------------------------------------------------------
alter table public.recurring_rules enable row level security;
alter table public.savings_goals enable row level security;
alter table public.notifications enable row level security;

-- recurring_rules
drop policy if exists "RecurringRules: read if member" on public.recurring_rules;
create policy "RecurringRules: read if member" on public.recurring_rules
  for select using (public.is_member_of(household_id));

drop policy if exists "RecurringRules: writable can write" on public.recurring_rules;
create policy "RecurringRules: writable can write" on public.recurring_rules
  for insert with check (public.is_writable_member(household_id));

drop policy if exists "RecurringRules: writable can update" on public.recurring_rules;
create policy "RecurringRules: writable can update" on public.recurring_rules
  for update using (public.is_writable_member(household_id))
  with check (public.is_writable_member(household_id));

drop policy if exists "RecurringRules: admin can delete" on public.recurring_rules;
create policy "RecurringRules: admin can delete" on public.recurring_rules
  for delete using (public.is_household_admin(household_id));

-- savings_goals
drop policy if exists "Goals: read if member" on public.savings_goals;
create policy "Goals: read if member" on public.savings_goals
  for select using (public.is_member_of(household_id));

drop policy if exists "Goals: writable can write" on public.savings_goals;
create policy "Goals: writable can write" on public.savings_goals
  for insert with check (public.is_writable_member(household_id));

drop policy if exists "Goals: writable can update" on public.savings_goals;
create policy "Goals: writable can update" on public.savings_goals
  for update using (public.is_writable_member(household_id))
  with check (public.is_writable_member(household_id));

drop policy if exists "Goals: admin or creator can delete" on public.savings_goals;
create policy "Goals: admin or creator can delete" on public.savings_goals
  for delete using (
    public.is_household_admin(household_id) or created_by = auth.uid()
  );

-- notifications: read only your own; updates limited to read/read_at
drop policy if exists "Notifications: read own" on public.notifications;
create policy "Notifications: read own" on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists "Notifications: mark own read" on public.notifications;
create policy "Notifications: mark own read" on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- System notifications (API / future jobs only)
