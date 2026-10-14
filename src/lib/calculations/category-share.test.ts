import { describe, expect, it } from "vitest";

import type { CategoryPlanRow } from "./budget";
import { buildCategoryShares, totalOfShares } from "./category-share";

function row(categoryId: string, actual: number): CategoryPlanRow {
  return {
    categoryId,
    categoryName: categoryId,
    planned: 0,
    actual,
    difference: actual,
    overspend: actual,
    isOverBudget: actual > 0,
    percentage: 0,
    isOverridden: false,
  };
}

describe("buildCategoryShares", () => {
  it("orders categories by what was actually spent, largest first", () => {
    const shares = buildCategoryShares([row("a", 100), row("b", 300), row("c", 200)], "Otros", 5);

    expect(shares.map((share) => share.categoryId)).toEqual(["b", "c", "a"]);
  });

  it("works out each share of the month's spending", () => {
    const shares = buildCategoryShares([row("a", 250), row("b", 750)], "Otros", 5);

    expect(shares.map((share) => share.percentage)).toEqual([75, 25]);
  });

  it("leaves out a category nothing was spent on", () => {
    // A zero slice is a legend entry that says nothing.
    const shares = buildCategoryShares([row("a", 100), row("b", 0)], "Otros", 5);

    expect(shares).toHaveLength(1);
  });

  it("folds everything past the limit into one row", () => {
    const rows = [row("a", 500), row("b", 400), row("c", 30), row("d", 20), row("e", 50)];

    const shares = buildCategoryShares(rows, "Otros", 2);

    expect(shares.map((share) => share.name)).toEqual(["a", "b", "Otros"]);
    expect(shares.at(2)?.amount).toBe(100);
    expect(shares.at(2)?.isOther).toBe(true);
  });

  it("adds no tail row when everything fits", () => {
    const shares = buildCategoryShares([row("a", 100), row("b", 50)], "Otros", 5);

    expect(shares.some((share) => share.isOther)).toBe(false);
  });

  it("returns nothing for a month with no spending at all", () => {
    expect(buildCategoryShares([], "Otros", 5)).toEqual([]);
  });
});

describe("totalOfShares", () => {
  it("adds the slices back up to the whole", () => {
    const shares = buildCategoryShares([row("a", 250), row("b", 750)], "Otros", 5);

    expect(totalOfShares(shares)).toBe(1000);
  });

  it("is zero when there is nothing to add", () => {
    expect(totalOfShares([])).toBe(0);
  });
});
