import { isoDateToMonthKey, type MonthKey } from "@/lib/dates/month";
import type { ExpenseRow } from "@/types/database";

import { splitByWeights, sumAmounts } from "./money";

/**
 * Expenses that reach beyond the month they were recorded in.
 *
 * Two independent dials, which compose:
 *
 *   - `installments` spreads ONE amount across N consecutive months. A water
 *     bill covering two months counts as half in each. On a credit card this is
 *     a purchase "a cuotas", and a rate adds the bank's interest.
 *   - `repeat_months` repeats the SAME amount every N months, for the fixed
 *     bills you already know: rent, subscriptions.
 *
 * The water bill uses both — it arrives every two months and covers two months
 * — which together give continuous monthly coverage.
 */

/** Whole months from one month key to another. Negative when `to` is earlier. */
function monthsBetween(from: MonthKey, to: MonthKey): number {
  const fromYear = Number(from.slice(0, 4));
  const fromMonth = Number(from.slice(5, 7));
  const toYear = Number(to.slice(0, 4));
  const toMonth = Number(to.slice(5, 7));
  return (toYear - fromYear) * 12 + (toMonth - fromMonth);
}

/**
 * Converts an effective annual rate to the equivalent monthly effective rate.
 *
 * Colombian cards quote %EA, so 28,5% EA is `28.5`. The conversion is the
 * twelfth root, not a division by twelve — compounding is the whole point.
 */
export function monthlyRateFromAnnualPercent(annualRatePercent: number): number {
  return (1 + annualRatePercent / 100) ** (1 / 12) - 1;
}

export interface InstallmentPlan {
  count: number;
  /** What each month is charged, in order. */
  amounts: number[];
  /** Everything that will be paid across the whole plan. */
  total: number;
  /** What the plan costs beyond the purchase price. Zero without a rate. */
  interest: number;
  /** The charge at a position, or zero outside the plan. */
  amountAt: (index: number) => number;
}

function planOf(amounts: number[], principal: number): InstallmentPlan {
  const byIndex = new Map(amounts.map((amount, index) => [index, amount]));
  const total = sumAmounts(amounts);

  return {
    count: amounts.length,
    amounts,
    total,
    interest: total - principal,
    amountAt: (index) => byIndex.get(index) ?? 0,
  };
}

/**
 * What each month of an expense costs.
 *
 * Without a rate the amount is split exactly, so the parts add back up to the
 * original — a $160.000 bill over two months is $80.000 twice, never $79.999.
 *
 * With a rate it is a standard annuity: every cuota is the same rounded figure,
 * as the bank charges it, and the total therefore exceeds the purchase price by
 * the interest.
 */
export function buildInstallmentPlan(
  principal: number,
  count: number,
  annualRatePercent: number | null,
): InstallmentPlan {
  if (count <= 1) {
    return planOf([principal], principal);
  }

  if (annualRatePercent === null || annualRatePercent === 0) {
    const shares = splitByWeights(
      principal,
      Array.from({ length: count }, () => 1),
      (weight) => weight,
    );
    return planOf(
      shares.map((share) => share.share),
      principal,
    );
  }

  const monthlyRate = monthlyRateFromAnnualPercent(annualRatePercent);
  const cuota = Math.round((principal * monthlyRate) / (1 - (1 + monthlyRate) ** -count));

  return planOf(
    Array.from({ length: count }, () => cuota),
    principal,
  );
}

/** One month's share of an expense. Shaped like the row it came from, so every
 * existing calculation keeps working on it unchanged. */
export interface MonthExpense extends ExpenseRow {
  /** This month's share. The row's own `amount` field carries it too. */
  monthKey: MonthKey;
  /** 1-based position within the installment plan. */
  installmentIndex: number;
  installmentCount: number;
  /** What was actually recorded on the purchase, before any spreading. */
  fullAmount: number;
  /** True when the plan charges more than the purchase price. */
  hasInterest: boolean;
}

/**
 * The share of an expense that belongs to a given month, or `null` when it
 * contributes nothing.
 *
 * Overlapping occurrences are summed: if a repeating expense spans more months
 * than its repeat interval, two occurrences genuinely do land in the same month.
 */
export function expenseShareForMonth(expense: ExpenseRow, month: MonthKey): MonthExpense | null {
  const start = isoDateToMonthKey(expense.occurred_on);
  const offset = monthsBetween(start, month);
  if (offset < 0) {
    return null;
  }

  const count = Math.max(expense.installments, 1);
  const plan = buildInstallmentPlan(expense.amount, count, expense.annual_rate_percent);
  const repeat = expense.repeat_months;

  let amount = 0;
  let index = 0;

  if (repeat === null) {
    amount = plan.amountAt(offset);
    index = offset + 1;
  } else {
    const lastStartOffset =
      expense.repeat_until === null
        ? offset
        : Math.min(offset, monthsBetween(start, isoDateToMonthKey(expense.repeat_until)));

    for (let startOffset = 0; startOffset <= lastStartOffset; startOffset += repeat) {
      const within = offset - startOffset;
      const share = plan.amountAt(within);
      if (share > 0) {
        amount += share;
        index = within + 1;
      }
    }
  }

  if (amount === 0) {
    return null;
  }

  return {
    ...expense,
    amount,
    monthKey: month,
    installmentIndex: index,
    installmentCount: count,
    fullAmount: expense.amount,
    hasInterest: plan.interest > 0,
  };
}

/** Every expense share that lands in one month. */
export function expensesForMonth(expenses: readonly ExpenseRow[], month: MonthKey): MonthExpense[] {
  const shares: MonthExpense[] = [];
  for (const expense of expenses) {
    const share = expenseShareForMonth(expense, month);
    if (share !== null) {
      shares.push(share);
    }
  }
  return shares;
}
