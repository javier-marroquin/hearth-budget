-- =============================================================================
-- 0005_calendar_events.sql
-- calendar_events: visual events on the household calendar.
-- Can be linked to expenses, incomes, contributions, goals (polymorphic).
-- =============================================================================

do $$ begin
  create type calendar_event_type as enum (
    'expense', 'income', 'contribution', 'goal', 'reminder'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type calendar_event_status as enum (
    'pending', 'paid', 'overdue', 'recurring', 'contribution', 'savings', 'completed'
  );
exception when duplicate_object then null; end $$;

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  event_type calendar_event_type not null,
  related_id uuid,
  related_type text,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default true,
  status calendar_event_status not null default 'pending',
  color text,
  recurring_rule_id uuid,
  user_id uuid references public.profiles(id) on delete set null,
  amount numeric(14, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_household_start_idx
  on public.calendar_events (household_id, start_at);
create index if not exists calendar_status_idx
  on public.calendar_events (household_id, status);
create index if not exists calendar_user_idx
  on public.calendar_events (household_id, user_id);
create index if not exists calendar_related_idx
  on public.calendar_events (related_type, related_id);

drop trigger if exists calendar_events_updated_at on public.calendar_events;
create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute procedure public.set_updated_at();

-- RLS -----------------------------------------------------------------------
alter table public.calendar_events enable row level security;

drop policy if exists "CalendarEvents: read if member" on public.calendar_events;
create policy "CalendarEvents: read if member" on public.calendar_events
  for select using (public.is_member_of(household_id));

drop policy if exists "CalendarEvents: writable members can write" on public.calendar_events;
create policy "CalendarEvents: writable members can write" on public.calendar_events
  for insert with check (public.is_writable_member(household_id));

drop policy if exists "CalendarEvents: writable members can update" on public.calendar_events;
create policy "CalendarEvents: writable members can update" on public.calendar_events
  for update using (public.is_writable_member(household_id))
  with check (public.is_writable_member(household_id));

drop policy if exists "CalendarEvents: writable members can delete" on public.calendar_events;
create policy "CalendarEvents: writable members can delete" on public.calendar_events
  for delete using (public.is_writable_member(household_id));

-- Enable realtime broadcasting for this table
-- (Configure on the Supabase dashboard too: Database -> Replication -> calendar_events)
alter publication supabase_realtime add table public.calendar_events;
