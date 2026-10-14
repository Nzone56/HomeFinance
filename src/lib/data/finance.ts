import { monthEndIsoDate, type MonthKey } from "@/lib/dates/month";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  BudgetMonthOverrideRow,
  BudgetTemplateItemRow,
  CategoryRow,
  ExpenseRow,
  IncomeMonthOverrideRow,
  IncomeRow,
  IncomeTemplateAmountRow,
  IncomeTemplateItemRow,
  PaymentMethodRow,
  TransferRow,
} from "@/types/database";

import { rowsOf } from "./query";

type SupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * Everything the app can read, in one shape.
 *
 * Each page loads a slice of this rather than the whole thing — see the loaders
 * below. The slices are `Pick`ed from here so the field names and types are
 * defined once.
 */
export interface FinanceData {
  categories: CategoryRow[];
  paymentMethods: PaymentMethodRow[];
  /** Everything up to the end of the month — balances carry over. */
  expenses: ExpenseRow[];
  incomes: IncomeRow[];
  transfers: TransferRow[];
  budgetTemplate: BudgetTemplateItemRow[];
  budgetOverrides: BudgetMonthOverrideRow[];
  incomeTemplate: IncomeTemplateItemRow[];
  /** Dated changes to what an income source is expected to bring. */
  incomeTemplateAmounts: IncomeTemplateAmountRow[];
  incomeOverrides: IncomeMonthOverrideRow[];
}

export type DashboardData = FinanceData;
export type MovementsData = Pick<
  FinanceData,
  "categories" | "paymentMethods" | "expenses" | "transfers"
>;
export type IncomePageData = Pick<
  FinanceData,
  "paymentMethods" | "incomes" | "incomeTemplate" | "incomeTemplateAmounts" | "incomeOverrides"
>;
export type PlanData = Pick<
  FinanceData,
  | "categories"
  | "expenses"
  | "budgetTemplate"
  | "budgetOverrides"
  | "incomeTemplate"
  | "incomeTemplateAmounts"
  | "incomeOverrides"
>;
export type SettingsData = Pick<
  FinanceData,
  "categories" | "paymentMethods" | "incomeTemplate" | "incomeTemplateAmounts"
>;

/*
 * One builder per table.
 *
 * None of them name a household: Row Level Security scopes every read to the
 * caller's own. That is the authorization boundary doing its job, and it is why
 * a mistake here cannot reach another household's data.
 *
 * Transactions stop at the end of the selected month rather than only within it,
 * because credit-card debt is a running balance. Rows dated
 * later are excluded so browsing back to September does not show a card paid off
 * in October.
 */

const categoriesQuery = (supabase: SupabaseClient) =>
  supabase.from("categories").select("*").order("sort_order").order("name");

const paymentMethodsQuery = (supabase: SupabaseClient) =>
  supabase.from("payment_methods").select("*").order("name");

const expensesQuery = (supabase: SupabaseClient, monthEnd: string) =>
  supabase
    .from("expenses")
    .select("*")
    .lte("occurred_on", monthEnd)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false });

const incomesQuery = (supabase: SupabaseClient, monthEnd: string) =>
  supabase.from("incomes").select("*").lte("occurred_on", monthEnd).order("occurred_on", {
    ascending: false,
  });

const transfersQuery = (supabase: SupabaseClient, monthEnd: string) =>
  supabase.from("transfers").select("*").lte("occurred_on", monthEnd).order("occurred_on", {
    ascending: false,
  });

const budgetTemplateQuery = (supabase: SupabaseClient) =>
  supabase.from("budget_template_items").select("*");

const budgetOverridesQuery = (supabase: SupabaseClient) =>
  supabase.from("budget_month_overrides").select("*");

const incomeTemplateQuery = (supabase: SupabaseClient) =>
  supabase.from("income_template_items").select("*").order("label");

const incomeTemplateAmountsQuery = (supabase: SupabaseClient) =>
  supabase.from("income_template_amounts").select("*");

const incomeOverridesQuery = (supabase: SupabaseClient) =>
  supabase.from("income_month_overrides").select("*");

/** The dashboard is the one view that genuinely needs all of it. */
export async function loadDashboardData(month: MonthKey): Promise<DashboardData> {
  const supabase = await createServerSupabaseClient();
  const monthEnd = monthEndIsoDate(month);

  const [
    categories,
    paymentMethods,
    expenses,
    incomes,
    transfers,
    budgetTemplate,
    budgetOverrides,
    incomeTemplate,
    incomeTemplateAmounts,
    incomeOverrides,
  ] = await Promise.all([
    rowsOf("load categories", () => categoriesQuery(supabase)),
    rowsOf("load payment methods", () => paymentMethodsQuery(supabase)),
    rowsOf("load expenses", () => expensesQuery(supabase, monthEnd)),
    rowsOf("load incomes", () => incomesQuery(supabase, monthEnd)),
    rowsOf("load transfers", () => transfersQuery(supabase, monthEnd)),
    rowsOf("load budget template", () => budgetTemplateQuery(supabase)),
    rowsOf("load budget overrides", () => budgetOverridesQuery(supabase)),
    rowsOf("load income template", () => incomeTemplateQuery(supabase)),
    rowsOf("load income amounts", () => incomeTemplateAmountsQuery(supabase)),
    rowsOf("load income overrides", () => incomeOverridesQuery(supabase)),
  ]);

  return {
    categories,
    paymentMethods,
    expenses,
    incomes,
    transfers,
    budgetTemplate,
    budgetOverrides,
    incomeTemplate,
    incomeTemplateAmounts,
    incomeOverrides,
  };
}

/** Spending and transfers, with the names needed to label them. */
export async function loadMovementsData(month: MonthKey): Promise<MovementsData> {
  const supabase = await createServerSupabaseClient();
  const monthEnd = monthEndIsoDate(month);

  const [categories, paymentMethods, expenses, transfers] = await Promise.all([
    rowsOf("load categories", () => categoriesQuery(supabase)),
    rowsOf("load payment methods", () => paymentMethodsQuery(supabase)),
    rowsOf("load expenses", () => expensesQuery(supabase, monthEnd)),
    rowsOf("load transfers", () => transfersQuery(supabase, monthEnd)),
  ]);

  return { categories, paymentMethods, expenses, transfers };
}

/** What arrived, against what was expected. No expenses involved. */
export async function loadIncomePageData(month: MonthKey): Promise<IncomePageData> {
  const supabase = await createServerSupabaseClient();
  const monthEnd = monthEndIsoDate(month);

  const [paymentMethods, incomes, incomeTemplate, incomeTemplateAmounts, incomeOverrides] =
    await Promise.all([
      rowsOf("load payment methods", () => paymentMethodsQuery(supabase)),
      rowsOf("load incomes", () => incomesQuery(supabase, monthEnd)),
      rowsOf("load income template", () => incomeTemplateQuery(supabase)),
      rowsOf("load income amounts", () => incomeTemplateAmountsQuery(supabase)),
      rowsOf("load income overrides", () => incomeOverridesQuery(supabase)),
    ]);

  return { paymentMethods, incomes, incomeTemplate, incomeTemplateAmounts, incomeOverrides };
}

/**
 * Templates and overrides, plus the expenses up to the end of the month — only
 * so the repeating ones can plan their categories by themselves.
 */
export async function loadPlanData(month: MonthKey): Promise<PlanData> {
  const supabase = await createServerSupabaseClient();
  const monthEnd = monthEndIsoDate(month);

  const [
    categories,
    expenses,
    budgetTemplate,
    budgetOverrides,
    incomeTemplate,
    incomeTemplateAmounts,
    incomeOverrides,
  ] = await Promise.all([
    rowsOf("load categories", () => categoriesQuery(supabase)),
    rowsOf("load expenses", () => expensesQuery(supabase, monthEnd)),
    rowsOf("load budget template", () => budgetTemplateQuery(supabase)),
    rowsOf("load budget overrides", () => budgetOverridesQuery(supabase)),
    rowsOf("load income template", () => incomeTemplateQuery(supabase)),
    rowsOf("load income amounts", () => incomeTemplateAmountsQuery(supabase)),
    rowsOf("load income overrides", () => incomeOverridesQuery(supabase)),
  ]);

  return {
    categories,
    expenses,
    budgetTemplate,
    budgetOverrides,
    incomeTemplate,
    incomeTemplateAmounts,
    incomeOverrides,
  };
}

/** Reference data only: the household's own vocabulary. */
export async function loadSettingsData(): Promise<SettingsData> {
  const supabase = await createServerSupabaseClient();

  const [categories, paymentMethods, incomeTemplate, incomeTemplateAmounts] = await Promise.all([
    rowsOf("load categories", () => categoriesQuery(supabase)),
    rowsOf("load payment methods", () => paymentMethodsQuery(supabase)),
    rowsOf("load income template", () => incomeTemplateQuery(supabase)),
    rowsOf("load income amounts", () => incomeTemplateAmountsQuery(supabase)),
  ]);

  return { categories, paymentMethods, incomeTemplate, incomeTemplateAmounts };
}
