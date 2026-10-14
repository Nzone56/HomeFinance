-- When Supabase Auth creates a user, give them a profile and drop them into
-- the household.
--
-- The MVP has exactly one household, so a new user joins the existing one
-- rather than creating their own. No user id is ever hardcoded: the household
-- is looked up, and the display name comes from the invite metadata.
--
-- To add the two users, invite them from the Supabase dashboard
-- (Authentication -> Users -> Invite) and keep public signups disabled.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_household_id uuid;
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  select id
  into target_household_id
  from public.households
  order by created_at
  limit 1;

  if target_household_id is not null then
    insert into public.household_members (household_id, user_id)
    values (target_household_id, new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
