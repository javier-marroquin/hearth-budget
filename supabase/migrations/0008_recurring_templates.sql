-- =============================================================================
-- 0008_recurring_templates.sql
-- Fixed recurring income/expense templates (salary, internet, etc.)
-- =============================================================================

do $$ begin
  create type recurring_template_kind as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

create table if not exists public.recurring_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  kind recurring_template_kind not null,
  active boolean not null default true,
  label text not null check (length(trim(label)) > 0),
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'USD',
  category_id uuid references public.categories(id) on delete set null,
  user_id uuid references public.profiles(id) on delete set null,
  source text,
  expense_type expense_type,
  split_method split_method,
  recurring_rule_id uuid not null references public.recurring_rules(id) on delete cascade,
  last_materialized_on date,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_templates_expense_fields check (
    kind = 'income' or (expense_type is not null and split_method is not null)
  ),
  constraint recurring_templates_income_user check (
    kind = 'expense' or user_id is not null
  )
);

create index if not exists recurring_templates_household_idx
  on public.recurring_templates (household_id, active);

drop trigger if exists recurring_templates_updated_at on public.recurring_templates;
create trigger recurring_templates_updated_at before update on public.recurring_templates
  for each row execute procedure public.set_updated_at();

alter table public.incomes
  add column if not exists recurring_template_id uuid
  references public.recurring_templates(id) on delete set null;

alter table public.expenses
  add column if not exists recurring_template_id uuid
  references public.recurring_templates(id) on delete set null;

create unique index if not exists incomes_template_date_uidx
  on public.incomes (recurring_template_id, date)
  where recurring_template_id is not null;

create unique index if not exists expenses_template_date_uidx
  on public.expenses (recurring_template_id, date)
  where recurring_template_id is not null;

alter table public.recurring_templates enable row level security;

drop policy if exists "RecurringTemplates: read if member" on public.recurring_templates;
create policy "RecurringTemplates: read if member"
  on public.recurring_templates for select
  using (public.is_member_of(household_id));

drop policy if exists "RecurringTemplates: writable can insert" on public.recurring_templates;
create policy "RecurringTemplates: writable can insert"
  on public.recurring_templates for insert
  with check (public.is_writable_member(household_id));

drop policy if exists "RecurringTemplates: writable can update" on public.recurring_templates;
create policy "RecurringTemplates: writable can update"
  on public.recurring_templates for update
  using (public.is_writable_member(household_id))
  with check (public.is_writable_member(household_id));

drop policy if exists "RecurringTemplates: admin can delete" on public.recurring_templates;
create policy "RecurringTemplates: admin can delete"
  on public.recurring_templates for delete
  using (public.is_household_admin(household_id));
