-- Row Level Security.
--
-- This is the real authorization boundary. The Next.js app only ever talks to
-- Supabase with the caller's own JWT (the anon key plus the user's session),
-- so every read and write below is filtered by these policies. The
-- service_role key is deliberately never used by the application.

-- ---------------------------------------------------------------------------
-- Membership helpers
--
-- SECURITY DEFINER so that a policy on household_members can consult
-- household_members without recursing into its own policy. Both are STABLE and
-- pin search_path, so they cannot be hijacked by a mutable search_path.
-- ---------------------------------------------------------------------------

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = hid
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.shares_household_with(other_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.household_members me
    join public.household_members them on them.household_id = me.household_id
    where me.user_id = (select auth.uid())
      and them.user_id = other_user_id
  );
$$;

revoke all on function public.is_household_member(uuid) from public, anon;
revoke all on function public.shares_household_with(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.shares_household_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere. A table without a policy denies everything, which is
-- the failure mode we want.
-- ---------------------------------------------------------------------------

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.household_members enable row level security;
alter table public.categories enable row level security;
alter table public.payment_methods enable row level security;
alter table public.expenses enable row level security;
alter table public.incomes enable row level security;
alter table public.transfers enable row level security;
alter table public.budget_template_items enable row level security;
alter table public.budget_month_overrides enable row level security;
alter table public.income_template_items enable row level security;
alter table public.income_month_overrides enable row level security;

-- The app is private: anonymous callers get nothing at all.
revoke all on all tables in schema public from anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------------

create policy households_select on public.households
  for select to authenticated
  using (public.is_household_member(id));

create policy households_update on public.households
  for update to authenticated
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.shares_household_with(id));

-- You may rename yourself, nobody else.
create policy profiles_update on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy household_members_select on public.household_members
  for select to authenticated
  using (public.is_household_member(household_id));

-- Members may adjust share weights; joining and leaving is an admin operation
-- performed in SQL, not from the app.
create policy household_members_update on public.household_members
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

-- ---------------------------------------------------------------------------
-- Household-scoped data.
--
-- Every one of these tables carries household_id, so a single predicate covers
-- it. USING filters the rows you may see or change; WITH CHECK stops you from
-- writing a row into someone else's household.
-- ---------------------------------------------------------------------------

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'categories',
    'payment_methods',
    'expenses',
    'incomes',
    'transfers',
    'budget_template_items',
    'budget_month_overrides',
    'income_template_items',
    'income_month_overrides'
  ]
  loop
    execute format(
      'create policy %1$I_select on public.%1$I for select to authenticated
         using (public.is_household_member(household_id))',
      target_table
    );
    execute format(
      'create policy %1$I_insert on public.%1$I for insert to authenticated
         with check (public.is_household_member(household_id))',
      target_table
    );
    execute format(
      'create policy %1$I_update on public.%1$I for update to authenticated
         using (public.is_household_member(household_id))
         with check (public.is_household_member(household_id))',
      target_table
    );
    execute format(
      'create policy %1$I_delete on public.%1$I for delete to authenticated
         using (public.is_household_member(household_id))',
      target_table
    );
  end loop;
end;
$$;
