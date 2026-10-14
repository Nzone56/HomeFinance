import { shiftMonthKey, type MonthKey } from "@/lib/dates/month";
import type { ExpenseRow, IncomeRow } from "@/types/database";

import { expensesForMonth } from "./installments";
import { activeOnly, filterByMonth, totalAmount } from "./transactions";

export interface TrendPoint {
  month: MonthKey;
  income: number;
  expenses: number;
  /** Income less expenses. Negative means the month ran at a loss. */
  remaining: number;
}

/**
 * Income against expenses over the months leading up to the one being viewed.
 *
 * Expenses use each month's *share*, so a bill covering two months shows up in
 * both and a purchase a cuotas shows its cuota — the same figures the rest of
 * the dashboard reports, so the trend can never disagree with the headline.
 *
 * Returns oldest first, which is the order a chart draws them in.
 */
export function buildMonthlyTrend(
  expenses: readonly ExpenseRow[],
  incomes: readonly IncomeRow[],
  month: MonthKey,
  monthCount: number,
): TrendPoint[] {
  if (monthCount <= 0) {
    return [];
  }

  const counted = activeOnly(expenses);

  return Array.from({ length: monthCount }, (_unused, index) => {
    const pointMonth = shiftMonthKey(month, index - (monthCount - 1));
    const monthIncome = totalAmount(filterByMonth(incomes, pointMonth));
    const monthExpenses = totalAmount(expensesForMonth(counted, pointMonth));

    return {
      month: pointMonth,
      income: monthIncome,
      expenses: monthExpenses,
      remaining: monthIncome - monthExpenses,
    };
  });
}

/** The largest figure any series reaches. Zero means there is nothing to plot. */
export function trendPeak(points: readonly TrendPoint[]): number {
  return points.reduce((peak, point) => Math.max(peak, point.income, point.expenses), 0);
}
