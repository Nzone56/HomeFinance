/**
 * Hand-written mirror of `supabase/migrations`. Kept by hand rather than
 * generated so the schema and the client types travel together in one commit.
 *
 * All monetary fields are whole COP pesos held in `bigint` columns. PostgREST
 * serialises them as JSON numbers; COP amounts are nowhere near
 * `Number.MAX_SAFE_INTEGER`, so `number` is exact here.
 */

export type PaymentMethodType = "bank_account" | "benefits_card" | "credit_card" | "cash";

export type HouseholdRole = "owner" | "member";

/** Columns the database always fills in for us. */
type Generated = "id" | "created_at";

type InsertOf<Row, Optional extends keyof Row = never> = Omit<
  Row,
  (Generated & keyof Row) | Optional
> &
  Partial<Pick<Row, ((Generated & keyof Row) | Optional) & keyof Row>>;

type UpdateOf<Row> = Partial<Omit<Row, Generated & keyof Row>>;

export type HouseholdRow = {
  id: string;
  name: string;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  display_name: string;
  created_at: string;
};

export type HouseholdMemberRow = {
  household_id: string;
  user_id: string;
  role: HouseholdRole;
  share_weight: number;
  joined_at: string;
};

export type CategoryRow = {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
  archived: boolean;
  created_at: string;
};

export type PaymentMethodRow = {
  id: string;
  household_id: string;
  user_id: string;
  name: string;
  type: PaymentMethodType;
  active: boolean;
  credit_limit: number | null;
  closing_day: number | null;
  due_day: number | null;
  /** Default %EA offered for installment purchases on this card. */
  default_annual_rate_percent: number | null;
  /** What a credit card already owed before the app knew about it. Zero otherwise. */
  opening_debt: number;
  created_at: string;
};

export type ExpenseRow = {
  id: string;
  household_id: string;
  /** Who paid. Independent of `payment_method_id`. */
  user_id: string;
  payment_method_id: string;
  category_id: string;
  amount: number;
  description: string;
  /** ISO date, `yyyy-MM-dd`. */
  occurred_on: string;
  shared: boolean;
  /**
   * For a shared expense, the percentage (0–100) that belongs to the payer; the
   * other member carries the rest. Ignored for a personal expense.
   */
  payer_share_percent: number;
  /** False hides the expense from every calculation, keeping the record. */
  active: boolean;
  /** Consecutive months this amount spreads across. 1 lands in a single month. */
  installments: number;
  /** %EA applied to the installments, e.g. 28.5. Null means no interest. */
  annual_rate_percent: number | null;
  /** Repeat the same amount every N months. Null means it happens once. */
  repeat_months: number | null;
  /** Last month a repeating expense applies to. Null means indefinitely. */
  repeat_until: string | null;
  notes: string | null;
  created_at: string;
};

export type IncomeRow = {
  id: string;
  household_id: string;
  user_id: string;
  payment_method_id: string | null;
  amount: number;
  label: string;
  occurred_on: string;
  notes: string | null;
  /** The expected source this income fulfils, when it was recorded from the plan. */
  template_item_id: string | null;
  created_at: string;
};

export type TransferRow = {
  id: string;
  household_id: string;
  user_id: string;
  from_payment_method_id: string;
  to_payment_method_id: string;
  amount: number;
  occurred_on: string;
  notes: string | null;
  created_at: string;
};

/** One version of a category's planned amount, in effect from `effective_from`. */
export type BudgetTemplateItemRow = {
  id: string;
  household_id: string;
  category_id: string;
  amount: number;
  /** First day of the month this version takes effect, `yyyy-MM-01`. */
  effective_from: string;
  created_at: string;
};

export type BudgetMonthOverrideRow = {
  id: string;
  household_id: string;
  /** First day of the month, `yyyy-MM-01`. */
  month: string;
  category_id: string;
  amount: number;
  created_at: string;
};

export type IncomeTemplateItemRow = {
  id: string;
  household_id: string;
  user_id: string;
  label: string;
  /** The amount the source started with; later changes are `IncomeTemplateAmountRow`s. */
  amount: number;
  active: boolean;
  /** First day of the first month the source is expected, `yyyy-MM-01`. */
  starts_on: string;
  /** Where the income lands. Never a credit card. */
  payment_method_id: string | null;
  created_at: string;
};

/** A change to a source's expected amount, in effect from `effective_from`. */
export type IncomeTemplateAmountRow = {
  id: string;
  household_id: string;
  template_item_id: string;
  /** First day of the month the change takes effect, `yyyy-MM-01`. */
  effective_from: string;
  amount: number;
  created_at: string;
};

export type IncomeMonthOverrideRow = {
  id: string;
  household_id: string;
  /** First day of the month, `yyyy-MM-01`. */
  month: string;
  template_item_id: string;
  amount: number;
  created_at: string;
};

/**
 * `Relationships` is required by postgrest-js for a table to satisfy its
 * `GenericTable` constraint. It is left empty because the app never asks
 * PostgREST to embed related rows — it joins in TypeScript instead, which keeps
 * these types hand-maintainable.
 */
type TableDef<Row, Optional extends keyof Row = never> = {
  Row: Row;
  Insert: InsertOf<Row, Optional>;
  Update: UpdateOf<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      households: TableDef<HouseholdRow>;
      profiles: TableDef<ProfileRow>;
      household_members: TableDef<HouseholdMemberRow, "role" | "share_weight" | "joined_at">;
      categories: TableDef<CategoryRow, "sort_order" | "archived">;
      payment_methods: TableDef<PaymentMethodRow, "active" | "default_annual_rate_percent">;
      expenses: TableDef<
        ExpenseRow,
        | "shared"
        | "payer_share_percent"
        | "active"
        | "notes"
        | "installments"
        | "annual_rate_percent"
        | "repeat_months"
        | "repeat_until"
      >;
      incomes: TableDef<IncomeRow, "payment_method_id" | "notes" | "template_item_id">;
      transfers: TableDef<TransferRow, "notes">;
      budget_template_items: TableDef<BudgetTemplateItemRow, "effective_from">;
      budget_month_overrides: TableDef<BudgetMonthOverrideRow>;
      income_template_items: TableDef<
        IncomeTemplateItemRow,
        "active" | "starts_on" | "payment_method_id"
      >;
      income_template_amounts: TableDef<IncomeTemplateAmountRow>;
      income_month_overrides: TableDef<IncomeMonthOverrideRow>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      payment_method_type: PaymentMethodType;
      household_role: HouseholdRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
