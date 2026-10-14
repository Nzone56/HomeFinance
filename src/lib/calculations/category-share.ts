import type { CategoryPlanRow } from "./budget";
import { percentageOf } from "./money";

/** As many slices as the categorical palette has distinct hues. */
export const CATEGORY_SLICE_LIMIT = 5;

export interface CategoryShare {
  categoryId: string;
  name: string;
  amount: number;
  /** Share of everything spent this month, rounded. */
  percentage: number;
  /** True for the row that stands in for everything past the cut. */
  isOther: boolean;
}

/**
 * The month's spending by category, largest first, with a tail.
 *
 * Only as many slices as the categorical palette has distinct hues; everything
 * past that folds into one "Otros" row rather than being given a generated
 * colour, which under colour blindness would be indistinguishable from a slice
 * already on screen. Categories with nothing spent are left out — a zero slice
 * is a legend entry that says nothing.
 */
export function buildCategoryShares(
  rows: readonly CategoryPlanRow[],
  otherLabel: string,
  limit: number,
): CategoryShare[] {
  const spent = rows.filter((row) => row.actual > 0).sort((a, b) => b.actual - a.actual);
  const total = spent.reduce((sum, row) => sum + row.actual, 0);

  const top = spent.slice(0, limit).map((row) => ({
    categoryId: row.categoryId,
    name: row.categoryName,
    amount: row.actual,
    percentage: percentageOf(row.actual, total),
    isOther: false,
  }));

  const tail = spent.slice(limit);
  if (tail.length === 0) {
    return top;
  }

  const tailTotal = tail.reduce((sum, row) => sum + row.actual, 0);
  return [
    ...top,
    {
      categoryId: "other",
      name: otherLabel,
      amount: tailTotal,
      percentage: percentageOf(tailTotal, total),
      isOther: true,
    },
  ];
}

/** Everything the shares add up to — the figure that goes in the middle. */
export function totalOfShares(shares: readonly CategoryShare[]): number {
  return shares.reduce((sum, share) => sum + share.amount, 0);
}
