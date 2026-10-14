-- Expenses that reach beyond the month they were recorded in.
--
-- Two independent dials, which compose:
--
--   installments  — spread ONE amount across N consecutive months.
--                   The water bill covers two months, so $160.000 with
--                   installments = 2 counts as $80.000 in each.
--                   On a credit card this is "a cuotas", and annual_rate_percent
--                   adds the interest the bank charges.
--
--   repeat_months — repeat the SAME amount every N months.
--                   Rent and subscriptions are known and fixed, so they are
--                   entered once and appear every month without retyping.
--
-- The water bill uses both: it repeats every two months and each bill covers
-- two months, which together give continuous monthly coverage.
--
-- Only the parameters are stored; the per-month amounts are derived. A purchase
-- stays one editable row and its schedule can never drift out of step with the
-- amount it came from.
--
-- Note the deliberate asymmetry for cuotas: an installment purchase contributes
-- its monthly cuota to each month's *expenses*, but the card's *debt* counts the
-- full principal, because the bank charged all of it at once.

alter table public.expenses
  add column if not exists installments smallint not null default 1,
  add column if not exists annual_rate_percent numeric(6, 3),
  add column if not exists repeat_months smallint,
  add column if not exists repeat_until date;

alter table public.expenses
  drop constraint if exists expenses_installments_range,
  add constraint expenses_installments_range
    check (installments between 1 and 120);

alter table public.expenses
  drop constraint if exists expenses_rate_requires_installments,
  add constraint expenses_rate_requires_installments
    check (
      annual_rate_percent is null
      or (installments > 1 and annual_rate_percent >= 0 and annual_rate_percent <= 200)
    );

alter table public.expenses
  drop constraint if exists expenses_repeat_range,
  add constraint expenses_repeat_range
    check (repeat_months is null or repeat_months between 1 and 60);

alter table public.expenses
  drop constraint if exists expenses_repeat_until_requires_repeat,
  add constraint expenses_repeat_until_requires_repeat
    check (repeat_until is null or repeat_months is not null);

comment on column public.expenses.installments is
  'Consecutive months this one amount spreads across. 1 means it lands in a single month.';
comment on column public.expenses.annual_rate_percent is
  'Effective annual rate (%EA) applied to the installments. Null means split with no interest.';
comment on column public.expenses.repeat_months is
  'Repeat the same amount every N months. Null means it happens once.';
comment on column public.expenses.repeat_until is
  'Last month a repeating expense applies to. Null means it carries on indefinitely.';

-- The rate a card uses by default, so a purchase need not restate it.
alter table public.payment_methods
  add column if not exists default_annual_rate_percent numeric(6, 3);

alter table public.payment_methods
  drop constraint if exists payment_methods_rate_is_credit_card,
  add constraint payment_methods_rate_is_credit_card
    check (
      default_annual_rate_percent is null
      or (
        type = 'credit_card'
        and default_annual_rate_percent >= 0
        and default_annual_rate_percent <= 200
      )
    );

comment on column public.payment_methods.default_annual_rate_percent is
  'Default %EA offered for installment purchases on this card.';
