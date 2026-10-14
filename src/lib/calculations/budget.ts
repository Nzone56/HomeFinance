import { isoDateToMonthKey, monthKeyToIsoDate, type MonthKey } from "@/lib/dates/month";
import type {
  BudgetMonthOverrideRow,
  BudgetTemplateItemRow,
  CategoryRow,
  ExpenseRow,
} from "@/types/database";

import { expensesForMonth } from "./installments";
import { difference, overspend, percentageOf } from "./money";
import { activeOnly, amountFor, totalsBy } from "./transactions";

export interface CategoryPlanRow {
  categoryId: string;
  categoryName: string;
  planned: number;
  actual: number;
  /** Actual minus planned. Positive means over the plan. */
  difference: number;
  /** How far past the plan, floored at zero. */
  overspend: number;
  isOverBudget: boolean;
  /** Actual as a percentage of planned, for the progress bar. */
  percentage: number;
  /** True when this month deliberately departs from the global template. */
  isOverridden: boolean;
}

/**
 * The planned amount per category for one month.
 *
 * Each template row is a version that applies from its `effective_from` month
 * until a later version of the same category takes over, so a plan made in
 * September never reaches back into August. A month override then replaces
 * that for its month only. A category with neither is simply not planned, which
 * is why the caller reads misses as zero rather than treating them as an error.
 */
export function resolvePlannedByCategory(
  templateItems: readonly BudgetTemplateItemRow[],
  overrides: readonly BudgetMonthOverrideRow[],
  month: MonthKey,
): Map<string, number> {
  const monthStart = monthKeyToIsoDate(month);
  const inEffect = new Map<string, BudgetTemplateItemRow>();

  for (const item of templateItems) {
    if (item.effective_from > monthStart) {
      continue;
    }
    const current = inEffect.get(item.category_id);
    if (current === undefined || item.effective_from > current.effective_from) {
      inEffect.set(item.category_id, item);
    }
  }

  const planned = new Map([...inEffect].map(([categoryId, item]) => [categoryId, item.amount]));
  for (const override of overrides) {
    if (isoDateToMonthKey(override.month) === month) {
      planned.set(override.category_id, override.amount);
    }
  }
  return planned;
}

/**
 * What each category's repeating expenses bring to a month's plan.
 *
 * An expense marked to repeat — rent, a subscription, a bimonthly bill — is
 * already known before the month starts, so it plans itself: nobody should
 * have to type Netflix into the plan as well as into the expenses. Each counts
 * its share of the month exactly as the month's actual spending does, so a
 * fixed bill plans and spends the same figure. Switched-off expenses and
 * one-off purchases take no part.
 */
export function recurringByCategory(
  expenses: readonly ExpenseRow[],
  month: MonthKey,
): Map<string, number> {
  const repeating = activeOnly(expenses).filter((expense) => expense.repeat_months !== null);
  return totalsBy(expensesForMonth(repeating, month), (expense) => expense.category_id);
}

/**
 * The plan a month is judged against: what was typed into the plan, plus what
 * the repeating expenses bring on their own. Typed amounts are what is planned
 * *on top* — groceries, the variable part — so the two add rather than compete.
 */
export function addPlanned(
  typed: ReadonlyMap<string, number>,
  recurring: ReadonlyMap<string, number>,
): Map<string, number> {
  const total = new Map(typed);
  for (const [categoryId, amount] of recurring) {
    total.set(categoryId, amountFor(total, categoryId) + amount);
  }
  return total;
}

/** Which categories this month overrides, for flagging them in the UI. */
export function overriddenCategoryIds(
  overrides: readonly BudgetMonthOverrideRow[],
  month: MonthKey,
): Set<string> {
  return new Set(
    overrides
      .filter((override) => isoDateToMonthKey(override.month) === month)
      .map((override) => override.category_id),
  );
}

/**
 * Planned versus actual, one row per category, in the household's own category
 * order. Archived categories are dropped unless something was actually spent
 * against them this month — hiding real spending would misstate the total.
 */
export function buildCategoryPlan(
  categories: readonly CategoryRow[],
  plannedByCategory: ReadonlyMap<string, number>,
  actualByCategory: ReadonlyMap<string, number>,
  overriddenIds: ReadonlySet<string> = new Set<string>(),
): CategoryPlanRow[] {
  return categories
    .filter((category) => !category.archived || actualByCategory.has(category.id))
    .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "es"))
    .map((category) => {
      const planned = amountFor(plannedByCategory, category.id);
      const actual = amountFor(actualByCategory, category.id);
      return {
        categoryId: category.id,
        categoryName: category.name,
        planned,
        actual,
        difference: difference(planned, actual),
        overspend: overspend(planned, actual),
        isOverBudget: actual > planned,
        percentage: percentageOf(actual, planned),
        isOverridden: overriddenIds.has(category.id),
      };
    });
}

/** Rows worth showing on the dashboard: anything planned or anything spent. */
export function withActivity(rows: readonly CategoryPlanRow[]): CategoryPlanRow[] {
  return rows.filter((row) => row.planned > 0 || row.actual > 0);
}

export function totalPlanned(rows: readonly CategoryPlanRow[]): number {
  return rows.reduce((total, row) => total + row.planned, 0);
}

export function totalActual(rows: readonly CategoryPlanRow[]): number {
  return rows.reduce((total, row) => total + row.actual, 0);
}
