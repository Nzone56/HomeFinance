import type { ExpenseRow } from "@/types/database";

import { percentageOf } from "./money";
import { amountFor, totalAmount, totalsBy } from "./transactions";

export interface PersonalSpend {
  userId: string;
  displayName: string;
  amount: number;
  /** Share of this person's own spending against everything they paid for. */
  percentageOfTotal: number;
}

export interface ExpenseBreakdown {
  /** Spending that benefits the household: rent, groceries, utilities. */
  household: number;
  /** Individual purchases, one row per person. */
  personal: PersonalSpend[];
  personalTotal: number;
  total: number;
  /** How much of the month's spending was for the household, 0-100. */
  householdPercentage: number;
}

/**
 * Splits a month's spending into what the household bought together and what
 * each person bought for themselves.
 *
 * The `shared` flag on an expense is the dividing line — the same flag that
 * decides whether an expense is split between the two (see `chargesFor`). So
 * anything counted as household spending here is exactly what each person's
 * part is taken from, and a personal expense belongs to whoever paid it.
 */
export function buildExpenseBreakdown(
  members: readonly { userId: string; displayName: string }[],
  expenses: readonly ExpenseRow[],
): ExpenseBreakdown {
  const householdExpenses = expenses.filter((expense) => expense.shared);
  const personalExpenses = expenses.filter((expense) => !expense.shared);

  const household = totalAmount(householdExpenses);
  const personalTotal = totalAmount(personalExpenses);
  const total = household + personalTotal;

  const personalByUser = totalsBy(personalExpenses, (expense) => expense.user_id);

  return {
    household,
    personal: members.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
      amount: amountFor(personalByUser, member.userId),
      percentageOfTotal: percentageOf(amountFor(personalByUser, member.userId), total),
    })),
    personalTotal,
    total,
    householdPercentage: percentageOf(household, total),
  };
}
