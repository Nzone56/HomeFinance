import { isoDateToMonthKey, type MonthKey } from "@/lib/dates/month";

import { sumBy } from "./money";

/** The shape every transaction table shares for date-and-amount maths. */
export interface DatedAmount {
  occurred_on: string;
  amount: number;
}

export function filterByMonth<T extends { occurred_on: string }>(
  items: readonly T[],
  month: MonthKey,
): T[] {
  return items.filter((item) => isoDateToMonthKey(item.occurred_on) === month);
}

/**
 * Everything that happened on or before the end of `month`.
 *
 * `yyyy-MM` keys compare correctly as plain strings, so no date parsing is
 * needed. Used for running balances — credit-card debt —
 * which carry over month to month rather than resetting on the first.
 */
export function filterUpToMonth<T extends { occurred_on: string }>(
  items: readonly T[],
  month: MonthKey,
): T[] {
  return items.filter((item) => isoDateToMonthKey(item.occurred_on) <= month);
}

/**
 * Drops anything switched off.
 *
 * An inactive expense keeps its record but takes no part in any total, which is
 * what makes "what would this month look like without that purchase?" a
 * reversible question rather than a deletion.
 */
export function activeOnly<T extends { active: boolean }>(items: readonly T[]): T[] {
  return items.filter((item) => item.active);
}

export function totalAmount(items: readonly { amount: number }[]): number {
  return sumBy(items, (item) => item.amount);
}

/**
 * Groups amounts by whatever key the caller picks — category, payer, payment
 * method. Returns a Map so a missing key is an explicit lookup miss rather than
 * an accidental `undefined` property.
 */
export function totalsBy<T extends { amount: number }>(
  items: readonly T[],
  keyOf: (item: T) => string,
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    totals.set(key, (totals.get(key) ?? 0) + item.amount);
  }
  return totals;
}

/** A group that recorded nothing totals zero, not `undefined`. */
export function amountFor(totals: ReadonlyMap<string, number>, key: string): number {
  return totals.get(key) ?? 0;
}
