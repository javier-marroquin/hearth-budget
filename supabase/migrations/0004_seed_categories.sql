-- =============================================================================
-- 0004_seed_categories.sql
-- Auto-seed default system categories whenever a new household is created.
-- =============================================================================

create or replace function public.seed_default_categories()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Expense categories
  insert into public.categories (household_id, name, type, color, icon, is_system)
  values
    (new.id, 'Vivienda',       'expense', '#0ea5e9', 'home',         true),
    (new.id, 'Alimentación',   'expense', '#22c55e', 'utensils',     true),
    (new.id, 'Transporte',     'expense', '#f97316', 'car',          true),
    (new.id, 'Salud',          'expense', '#ef4444', 'heart-pulse',  true),
    (new.id, 'Educación',      'expense', '#a855f7', 'graduation-cap', true),
    (new.id, 'Entretenimiento','expense', '#ec4899', 'sparkles',     true),
    (new.id, 'Servicios',      'expense', '#eab308', 'plug',         true),
    (new.id, 'Otros',          'expense', '#64748b', 'tag',          true);

  -- Income categories
  insert into public.categories (household_id, name, type, color, icon, is_system)
  values
    (new.id, 'Salario',        'income',  '#16a34a', 'briefcase',    true),
    (new.id, 'Freelance',      'income',  '#0d9488', 'laptop',       true),
    (new.id, 'Inversiones',    'income',  '#14b8a6', 'trending-up',  true),
    (new.id, 'Otros ingresos', 'income',  '#84cc16', 'plus-circle',  true);

  -- Savings categories
  insert into public.categories (household_id, name, type, color, icon, is_system)
  values
    (new.id, 'Ahorro general', 'savings', '#8b5cf6', 'piggy-bank',   true),
    (new.id, 'Emergencias',    'savings', '#06b6d4', 'shield',       true);

  return new;
end;
$$;

drop trigger if exists households_seed_categories on public.households;
create trigger households_seed_categories
  after insert on public.households
  for each row execute procedure public.seed_default_categories();
