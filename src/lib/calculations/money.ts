/**
 * Integer money arithmetic. Every amount in this module is a whole COP peso.
 *
 * Nothing here formats or knows about a locale — see `src/lib/format/currency`
 * for that.
 */

export function sumAmounts(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function sumBy<T>(items: readonly T[], select: (item: T) => number): number {
  return items.reduce((total, item) => total + select(item), 0);
}

export interface WeightedShare<T> {
  item: T;
  share: number;
}

/**
 * Splits `total` across `items` in proportion to their weights, without losing
 * or inventing a single peso.
 *
 * Uses the largest-remainder method: everyone gets their floored exact share,
 * then the leftover pesos go one each to the largest fractional remainders,
 * ties broken by position so the result is deterministic. The shares always add
 * back up to `total`.
 *
 * Returns each item paired with its share rather than a bare array, so callers
 * never have to line up two arrays by index.
 */
export function splitByWeights<T>(
  total: number,
  items: readonly T[],
  weightOf: (item: T) => number,
): WeightedShare<T>[] {
  const totalWeight = sumBy(items, weightOf);
  if (totalWeight <= 0) {
    return items.map((item) => ({ item, share: 0 }));
  }

  const sign = total < 0 ? -1 : 1;
  const magnitude = Math.abs(total);

  const entries = items.map((item, index) => {
    const exact = (magnitude * weightOf(item)) / totalWeight;
    const base = Math.floor(exact);
    return { item, index, base, fraction: exact - base };
  });

  const leftover = magnitude - sumBy(entries, (entry) => entry.base);
  const bumped = new Set(
    [...entries]
      .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
      .slice(0, leftover)
      .map((entry) => entry.index),
  );

  return entries.map((entry) => ({
    item: entry.item,
    share: (entry.base + (bumped.has(entry.index) ? 1 : 0)) * sign,
  }));
}

/**
 * How far actual spending ran past its plan. Positive means over budget;
 * under-spending reports `0` rather than a negative overrun.
 */
export function overspend(planned: number, actual: number): number {
  return Math.max(actual - planned, 0);
}

/** Actual minus planned. Positive means more was spent or earned than planned. */
export function difference(planned: number, actual: number): number {
  return actual - planned;
}

/**
 * Actual as a whole-number percentage of planned.
 *
 * With nothing planned there is no meaningful ratio, so spending against a zero
 * plan reports 100% (fully consumed) and spending nothing reports 0%.
 */
export function percentageOf(actual: number, planned: number): number {
  if (planned <= 0) {
    return actual > 0 ? 100 : 0;
  }
  return Math.round((actual / planned) * 100);
}
