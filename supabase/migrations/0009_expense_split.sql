-- A shared expense is split between the two members by percentage.
--
-- `payer_share_percent` is the part of a SHARED expense that belongs to the
-- member who paid it (`user_id`); the other member carries the rest. It
-- defaults to an even split. A personal expense ignores it — it is entirely
-- the payer's.
--
-- Nobody owes anybody: each member's spending is their personal expenses plus
-- their percentage of the shared ones. There is no settlement any more, so
-- `household_members.share_weight` is no longer read by the app. It is left in
-- place rather than dropped, to keep this migration purely additive.

alter table public.expenses
  add column if not exists payer_share_percent smallint not null default 50;

alter table public.expenses
  add constraint expenses_payer_share_percent_range
  check (payer_share_percent between 0 and 100);

comment on column public.expenses.payer_share_percent is
  'For a shared expense, the percentage that belongs to the payer (user_id). The other member carries the rest.';
