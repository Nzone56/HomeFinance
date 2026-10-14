-- Let an expense be switched off without being deleted.
--
-- An inactive expense keeps all its data but drops out of every calculation:
-- month totals, the plan comparison, credit-card debt and the settlement. That
-- makes it possible to ask "what would this month look like without that
-- purchase?" and get the answer back by switching it on again.
--
-- Defaults to true, so every existing row stays counted.

alter table public.expenses
  add column if not exists active boolean not null default true;

comment on column public.expenses.active is
  'False hides the expense from all calculations while keeping the record.';
