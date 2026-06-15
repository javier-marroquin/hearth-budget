-- Allow household owners to read their row before membership bootstrap completes.
-- Fixes: insert().select() on households failing RLS during onboarding.
drop policy if exists "Households: read if owner" on public.households;
create policy "Households: read if owner"
  on public.households for select
  using (owner_id = auth.uid());
