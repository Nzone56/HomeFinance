-- A plan takes effect from the month it is made, never backwards.
--
-- Until now a template line had no date: creating one, or changing its amount,
-- rewrote what every month had ever expected, including months that were
-- already closed. Three changes stop that:
--
--   1. `budget_template_items` rows become versions. A row applies from its
--      `effective_from` month until a later row for the same category takes
--      over. Saving the template writes the version for the current month.
--
--   2. `income_template_items` gains `starts_on`: a source is expected only from
--      the month it was created. Its `amount` is the amount it started with;
--      later changes live in `income_template_amounts`, one row per month a
--      change took effect. It also gains the account the income lands in.
--
--   3. `incomes` gains `template_item_id`, so an income recorded from the plan
--      ("marcar como recibido") says which expected source it fulfils. That is
--      what lets a month show a source as received exactly once.
--
-- Existing rows start in the month they were created.

-- 1. Budget template versions --------------------------------------------------

alter table public.budget_template_items add column effective_from date;

update public.budget_template_items
  set effective_from = date_trunc('month', created_at)::date;

alter table public.budget_template_items
  alter column effective_from set not null,
  alter column effective_from set default date_trunc('month', current_date)::date,
  add constraint budget_template_items_effective_from_month
    check (date_part('day', effective_from) = 1),
  drop constraint budget_template_items_household_id_category_id_key,
  add constraint budget_template_items_version_key
    unique (household_id, category_id, effective_from);

-- 2. Income sources: a start month, an account, and dated amount changes --------

alter table public.income_template_items
  add column starts_on date,
  add column payment_method_id uuid;

update public.income_template_items
  set starts_on = date_trunc('month', created_at)::date;

alter table public.income_template_items
  alter column starts_on set not null,
  alter column starts_on set default date_trunc('month', current_date)::date,
  add constraint income_template_items_starts_on_month
    check (date_part('day', starts_on) = 1),
  add constraint income_template_items_payment_method_fk
    foreign key (payment_method_id, household_id)
    references public.payment_methods (id, household_id);

create table public.income_template_amounts (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  template_item_id uuid not null,
  effective_from date not null check (date_part('day', effective_from) = 1),
  amount bigint not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (household_id, template_item_id, effective_from),
  constraint income_template_amounts_item_fk
    foreign key (template_item_id, household_id)
    references public.income_template_items (id, household_id) on delete cascade
);

alter table public.income_template_amounts enable row level security;

revoke all on public.income_template_amounts from anon;
grant select, insert, update, delete on public.income_template_amounts to authenticated;

create policy income_template_amounts_select on public.income_template_amounts
  for select to authenticated
  using (public.is_household_member(household_id));

create policy income_template_amounts_insert on public.income_template_amounts
  for insert to authenticated
  with check (public.is_household_member(household_id));

create policy income_template_amounts_update on public.income_template_amounts
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy income_template_amounts_delete on public.income_template_amounts
  for delete to authenticated
  using (public.is_household_member(household_id));

-- 3. Incomes remember the expected source they fulfil ---------------------------

alter table public.incomes add column template_item_id uuid;

alter table public.incomes
  add constraint incomes_template_item_fk
    foreign key (template_item_id, household_id)
    references public.income_template_items (id, household_id)
    on delete set null (template_item_id);

create index incomes_template_item_idx
  on public.incomes (template_item_id)
  where template_item_id is not null;

notify pgrst, 'reload schema';
