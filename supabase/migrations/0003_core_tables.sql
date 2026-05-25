-- =============================================================================
-- 0003_core_tables.sql
-- Core financial tables: categories, incomes, expenses, expense_splits,
-- contributions, payment_statuses.
-- =============================================================================

-- Enums ----------------------------------------------------------------------
do $$ begin
  create type category_type as enum ('income', 'expense', 'savings');
exception when duplicate_object then null; end $$;

do $$ begin
  create type expense_type as enum ('fixed', 'variable', 'debt', 'one_time');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contribution_status as enum ('pending', 'received', 'overdue');
exception when duplicate_object then null; end $$;

do $$ begin
  create type split_method as enum ('equal', 'percentage', 'income_based', 'custom');
exception when duplicate_object then null; end $$;

-- categories -----------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  type category_type not null,
  color text not null default '#6366f1',
  icon text not null default 'tag',
  is_system boolean not null default false,
  parent_id uuid references public.categories(id) on delete set null,
  monthly_budget numeric(14, 2) check (monthly_budget is null or monthly_budget >= 0),
  rollover_enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists categories_household_idx on public.categories (household_id);
create index if not exists categories_type_idx on public.categories (household_id, type);

-- incomes --------------------------------------------------------------------
create table if not exists public.incomes (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'COP',
  date date not null,
  category_id uuid references public.categories(id) on delete set null,
  source text,
  is_recurring boolean not null default false,
  recurring_rule_id uuid,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incomes_household_date_idx on public.incomes (household_id, date desc);
create index if not exists incomes_user_idx on public.incomes (user_id);
create index if not exists incomes_category_idx on public.incomes (category_id);

drop trigger if exists incomes_updated_at on public.incomes;
create trigger incomes_updated_at before update on public.incomes
  for each row execute procedure public.set_updated_at();

-- expenses -------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'COP',
  date date not null,
  due_date date,
  category_id uuid references public.categories(id) on delete set null,
  type expense_type not null,
  status payment_status not null default 'pending',
  paid_at timestamptz,
  paid_by uuid references public.profiles(id) on delete set null,
  split_method split_method not null default 'equal',
  is_recurring boolean not null default false,
  recurring_rule_id uuid,
  description text,
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_household_date_idx on public.expenses (household_id, date desc);
create index if not exists expenses_household_due_idx on public.expenses (household_id, due_date);
create index if not exists expenses_status_idx on public.expenses (household_id, status);
create index if not exists expenses_category_idx on public.expenses (category_id);

drop trigger if exists expenses_updated_at on public.expenses;
create trigger expenses_updated_at before update on public.expenses
  for each row execute procedure public.set_updated_at();

-- expense_splits --------------------------------------------------------------
create table if not exists public.expense_splits (
  id uuid primary key default uuid_generate_v4(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  percentage numeric(5, 2) check (percentage is null or (percentage >= 0 and percentage <= 100)),
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  constraint expense_splits_unique unique (expense_id, user_id)
);

create index if not exists expense_splits_expense_idx on public.expense_splits (expense_id);
create index if not exists expense_splits_user_idx on public.expense_splits (user_id);

-- contributions --------------------------------------------------------------
create table if not exists public.contributions (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'COP',
  expected_date date not null,
  received_date date,
  status contribution_status not null default 'pending',
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contributions_household_expected_idx
  on public.contributions (household_id, expected_date desc);
create index if not exists contributions_user_idx on public.contributions (user_id);
create index if not exists contributions_status_idx on public.contributions (household_id, status);

drop trigger if exists contributions_updated_at on public.contributions;
create trigger contributions_updated_at before update on public.contributions
  for each row execute procedure public.set_updated_at();

-- payment_statuses (immutable history) ---------------------------------------
create table if not exists public.payment_statuses (
  id uuid primary key default uuid_generate_v4(),
  household_id uuid not null references public.households(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  previous_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists payment_statuses_entity_idx
  on public.payment_statuses (entity_type, entity_id, created_at desc);

-- RLS policies ---------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.incomes enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_splits enable row level security;
alter table public.contributions enable row level security;
alter table public.payment_statuses enable row level security;

-- categories
drop policy if exists "Categories: read if member" on public.categories;
create policy "Categories: read if member" on public.categories
  for select using (public.is_member_of(household_id));

drop policy if exists "Categories: writable members can write" on public.categories;
create policy "Categories: writable members can write" on public.categories
  for insert with check (public.is_writable_member(household_id));

drop policy if exists "Categories: writable members can update" on public.categories;
create policy "Categories: writable members can update" on public.categories
  for update using (public.is_writable_member(household_id))
  with check (public.is_writable_member(household_id));

drop policy if exists "Categories: admin can delete" on public.categories;
create policy "Categories: admin can delete" on public.categories
  for delete using (public.is_household_admin(household_id));

-- incomes
drop policy if exists "Incomes: read if member" on public.incomes;
create policy "Incomes: read if member" on public.incomes
  for select using (public.is_member_of(household_id));

drop policy if exists "Incomes: writable members can write" on public.incomes;
create policy "Incomes: writable members can write" on public.incomes
  for insert with check (public.is_writable_member(household_id));

drop policy if exists "Incomes: writer of own or admin can update" on public.incomes;
create policy "Incomes: writer of own or admin can update" on public.incomes
  for update using (
    public.is_household_admin(household_id) or user_id = auth.uid()
  )
  with check (
    public.is_household_admin(household_id) or user_id = auth.uid()
  );

drop policy if exists "Incomes: writer or admin can delete" on public.incomes;
create policy "Incomes: writer or admin can delete" on public.incomes
  for delete using (
    public.is_household_admin(household_id) or user_id = auth.uid()
  );

-- expenses
drop policy if exists "Expenses: read if member" on public.expenses;
create policy "Expenses: read if member" on public.expenses
  for select using (public.is_member_of(household_id));

drop policy if exists "Expenses: writable members can write" on public.expenses;
create policy "Expenses: writable members can write" on public.expenses
  for insert with check (public.is_writable_member(household_id));

drop policy if exists "Expenses: writable members can update" on public.expenses;
create policy "Expenses: writable members can update" on public.expenses
  for update using (public.is_writable_member(household_id))
  with check (public.is_writable_member(household_id));

drop policy if exists "Expenses: admin or creator can delete" on public.expenses;
create policy "Expenses: admin or creator can delete" on public.expenses
  for delete using (
    public.is_household_admin(household_id) or created_by = auth.uid()
  );

-- expense_splits (gated through parent expense)
drop policy if exists "Splits: read if member" on public.expense_splits;
create policy "Splits: read if member" on public.expense_splits
  for select using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_member_of(e.household_id)
    )
  );

drop policy if exists "Splits: writable members can write" on public.expense_splits;
create policy "Splits: writable members can write" on public.expense_splits
  for insert with check (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_writable_member(e.household_id)
    )
  );

drop policy if exists "Splits: writable members can update" on public.expense_splits;
create policy "Splits: writable members can update" on public.expense_splits
  for update using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_writable_member(e.household_id)
    )
  );

drop policy if exists "Splits: writable members can delete" on public.expense_splits;
create policy "Splits: writable members can delete" on public.expense_splits
  for delete using (
    exists (
      select 1 from public.expenses e
      where e.id = expense_id and public.is_writable_member(e.household_id)
    )
  );

-- contributions
drop policy if exists "Contributions: read if member" on public.contributions;
create policy "Contributions: read if member" on public.contributions
  for select using (public.is_member_of(household_id));

drop policy if exists "Contributions: writable members can write" on public.contributions;
create policy "Contributions: writable members can write" on public.contributions
  for insert with check (public.is_writable_member(household_id));

drop policy if exists "Contributions: admin or own can update" on public.contributions;
create policy "Contributions: admin or own can update" on public.contributions
  for update using (
    public.is_household_admin(household_id) or user_id = auth.uid()
  )
  with check (
    public.is_household_admin(household_id) or user_id = auth.uid()
  );

drop policy if exists "Contributions: admin or creator can delete" on public.contributions;
create policy "Contributions: admin or creator can delete" on public.contributions
  for delete using (
    public.is_household_admin(household_id) or created_by = auth.uid()
  );

-- payment_statuses (read-only for members; writes via service role / triggers)
drop policy if exists "PaymentStatuses: read if member" on public.payment_statuses;
create policy "PaymentStatuses: read if member" on public.payment_statuses
  for select using (public.is_member_of(household_id));
