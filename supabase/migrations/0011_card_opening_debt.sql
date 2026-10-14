-- A credit card's debt from before the app knew about it.
--
-- Debt was purchases + cash advances - payments, counted from the first
-- purchase recorded here. A card already carrying a balance had nowhere to put
-- it, so paying a real statement drove the debt below zero: a 978.307 payment
-- on a card the app knew only 170.000 of read -808.307.
--
-- `opening_debt` is that earlier balance, entered once on the card. It belongs
-- to credit cards only, like the other card columns, and is never negative.

alter table public.payment_methods
  add column opening_debt bigint not null default 0,
  add constraint payment_methods_opening_debt_not_negative check (opening_debt >= 0),
  add constraint payment_methods_opening_debt_card_only
    check (type = 'credit_card' or opening_debt = 0);

notify pgrst, 'reload schema';
