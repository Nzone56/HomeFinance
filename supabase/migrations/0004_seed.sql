-- Seed the single MVP household and its starting categories, then back-fill
-- any users that already existed before 0003 installed the signup trigger.
--
-- Safe to run more than once.
--
-- Category names are user-facing data and are therefore in Spanish; they are
-- fully editable from Settings.

do $$
declare
  target_household_id uuid;
begin
  select id into target_household_id from public.households order by created_at limit 1;

  if target_household_id is null then
    insert into public.households (name)
    values ('Nuestra casa')
    returning id into target_household_id;
  end if;

  insert into public.categories (household_id, name, sort_order)
  values
    (target_household_id, 'Arriendo', 10),
    (target_household_id, 'Servicios', 20),
    (target_household_id, 'Mercado', 30),
    (target_household_id, 'Transporte', 40),
    (target_household_id, 'Entretenimiento', 50),
    (target_household_id, 'Suscripciones', 60),
    (target_household_id, 'Salud', 70),
    (target_household_id, 'Hogar', 80),
    (target_household_id, 'Otros', 90)
  on conflict (household_id, name) do nothing;

  -- Back-fill profiles and memberships for pre-existing auth users.
  insert into public.profiles (id, display_name)
  select
    u.id,
    coalesce(
      nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
      split_part(u.email, '@', 1)
    )
  from auth.users u
  on conflict (id) do nothing;

  insert into public.household_members (household_id, user_id)
  select target_household_id, p.id
  from public.profiles p
  on conflict do nothing;
end;
$$;
