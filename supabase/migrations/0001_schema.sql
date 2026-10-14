-- Home Finance: core schema.
--
-- Money is stored as `bigint` holding whole COP pesos. The Colombian peso has
-- no minor unit in everyday use, so the peso *is* the smallest currency unit.
-- Never introduce numeric/float money columns here.
--
-- Months are stored as a `date` pinned to the first day of the month.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.payment_method_type as enum (
  'bank_account',
  'benefits_card',
  'credit_card',
  'cash'
);

create type public.household_role as enum ('owner', 'member');

-- ---------------------------------------------------------------------------
-- Identity and tenancy
-- ---------------------------------------------------------------------------

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 1 and 60),
  created_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.household_role not null default 'member',
  -- Relative share of shared expenses. Two members at weight 1 split 50/50;
  -- weights 3 and 2 split 60/40. Kept as a weight so no cross-row
  -- "must sum to 100" constraint is needed.
  share_weight integer not null default 1 check (share_weight > 0),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  sort_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  unique (household_id, name),
  -- Target for composite foreign keys that pin a row to one household.
  unique (id, household_id)
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  type public.payment_method_type not null,
  active boolean not null default true,
  credit_limit bigint check (credit_limit > 0),
  -- Day of month, stored as given (1-31). Clamped to the real month length
  -- when a statement date is derived, so a card closing on the 31st still
  -- works in February.
  closing_day smallint check (closing_day between 1 and 31),
  due_day smallint check (due_day between 1 and 31),
  created_at timestamptz not null default now(),
  -- Credit-card columns belong to credit cards and nothing else.
  constraint payment_methods_credit_card_fields check (
    case
      when type = 'credit_card'
        then credit_limit is not null and closing_day is not null and due_day is not null
      else credit_limit is null and closing_day is null and due_day is null
    end
  ),
  unique (id, household_id)
);

create index payment_methods_household_idx on public.payment_methods (household_id);

-- ---------------------------------------------------------------------------
-- Transactions
--
-- Three distinct kinds, which is what keeps credit-card spending from being
-- counted twice:
--   expenses  - money leaving the household for goods or services
--   incomes   - money entering the household
--   transfers - money moving between payment methods (a credit-card payment,
--               or a reimbursement between partners). Never an expense.
-- ---------------------------------------------------------------------------

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- Who paid. Independent of which payment method was used.
  user_id uuid not null,
  payment_method_id uuid not null,
  category_id uuid not null,
  amount bigint not null check (amount > 0),
  description text not null check (char_length(btrim(description)) between 1 and 120),
  occurred_on date not null,
  -- Shared expenses are split between members by share_weight. Personal ones
  -- are excluded from the settlement entirely.
  shared boolean not null default true,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  constraint expenses_member_fk
    foreign key (household_id, user_id)
    references public.household_members (household_id, user_id),
  constraint expenses_payment_method_fk
    foreign key (payment_method_id, household_id)
    references public.payment_methods (id, household_id),
  constraint expenses_category_fk
    foreign key (category_id, household_id)
    references public.categories (id, household_id)
);

create index expenses_household_occurred_idx
  on public.expenses (household_id, occurred_on desc);
create index expenses_payment_method_idx on public.expenses (payment_method_id);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null,
  -- Optional: cash income need not land in a tracked account.
  payment_method_id uuid,
  amount bigint not null check (amount > 0),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  occurred_on date not null,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  constraint incomes_member_fk
    foreign key (household_id, user_id)
    references public.household_members (household_id, user_id),
  constraint incomes_payment_method_fk
    foreign key (payment_method_id, household_id)
    references public.payment_methods (id, household_id)
);

create index incomes_household_occurred_idx
  on public.incomes (household_id, occurred_on desc);

create table public.transfers (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null,
  from_payment_method_id uuid not null,
  to_payment_method_id uuid not null,
  amount bigint not null check (amount > 0),
  occurred_on date not null,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  constraint transfers_distinct_methods
    check (from_payment_method_id <> to_payment_method_id),
  constraint transfers_member_fk
    foreign key (household_id, user_id)
    references public.household_members (household_id, user_id),
  constraint transfers_from_fk
    foreign key (from_payment_method_id, household_id)
    references public.payment_methods (id, household_id),
  constraint transfers_to_fk
    foreign key (to_payment_method_id, household_id)
    references public.payment_methods (id, household_id)
);

create index transfers_household_occurred_idx
  on public.transfers (household_id, occurred_on desc);

-- ---------------------------------------------------------------------------
-- Plan: one global template plus sparse per-month overrides.
--
-- The planned amount for (month, category) is
--   coalesce(override.amount, template.amount, 0)
-- so a month that matches the template stores zero rows, and editing one month
-- never touches the template.
-- ---------------------------------------------------------------------------

create table public.budget_template_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  category_id uuid not null,
  amount bigint not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (household_id, category_id),
  constraint budget_template_items_category_fk
    foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete cascade
);

create table public.budget_month_overrides (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  month date not null check (date_part('day', month) = 1),
  category_id uuid not null,
  amount bigint not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (household_id, month, category_id),
  constraint budget_month_overrides_category_fk
    foreign key (category_id, household_id)
    references public.categories (id, household_id) on delete cascade
);

create table public.income_template_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null,
  label text not null check (char_length(btrim(label)) between 1 and 60),
  amount bigint not null check (amount >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (household_id, user_id, label),
  unique (id, household_id),
  constraint income_template_items_member_fk
    foreign key (household_id, user_id)
    references public.household_members (household_id, user_id) on delete cascade
);

create table public.income_month_overrides (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  month date not null check (date_part('day', month) = 1),
  template_item_id uuid not null,
  amount bigint not null check (amount >= 0),
  created_at timestamptz not null default now(),
  unique (household_id, month, template_item_id),
  constraint income_month_overrides_item_fk
    foreign key (template_item_id, household_id)
    references public.income_template_items (id, household_id) on delete cascade
);
