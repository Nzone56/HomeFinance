-- Keep the signup trigger off the public API surface.
--
-- `handle_new_user` is a trigger function. PostgREST still exposes anything in
-- the `public` schema at `/rest/v1/rpc/...`, so revoking EXECUTE removes it
-- from the API rather than relying on the call simply failing.
--
-- `is_household_member` and `shares_household_with` deliberately keep EXECUTE
-- for `authenticated`: the RLS policies evaluate them as the calling user, so
-- the grant is required. Both only ever answer a question about the caller
-- themselves ("am I in this household?", "do I share a household with this
-- person?"), so exposing them reveals nothing about anyone else.

revoke all on function public.handle_new_user() from public, anon, authenticated;
