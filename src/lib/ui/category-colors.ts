import type { CategoryShare } from "@/lib/calculations/category-share";

import { seriesColor } from "./series";

/**
 * Chrome, for the rolled-up tail and for any category outside the top slices.
 *
 * Not one more hue competing for identity: those categories are precisely the
 * ones the donut has already folded into "Otros".
 */
export const OTHER_CATEGORY_COLOR = "var(--chart-axis)";

/**
 * One colour per category, assigned in share order — largest first.
 *
 * Built once per render and handed to every card that names a category, so the
 * slice in the donut and the dot in the movements table are the same colour for
 * the same category.
 */
export function buildCategoryColors(shares: readonly CategoryShare[]): Map<string, string> {
  return new Map(
    shares.map((share, index) => [
      share.categoryId,
      share.isOther ? OTHER_CATEGORY_COLOR : seriesColor(index),
    ]),
  );
}
