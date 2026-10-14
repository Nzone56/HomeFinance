import { describe, expect, it } from "vitest";

import type { CategoryShare } from "@/lib/calculations/category-share";

import { buildCategoryColors, OTHER_CATEGORY_COLOR } from "./category-colors";
import { seriesColor } from "./series";

function share(categoryId: string, isOther = false): CategoryShare {
  return { categoryId, name: categoryId, amount: 100, percentage: 10, isOther };
}

describe("buildCategoryColors", () => {
  it("assigns slots in share order, largest first", () => {
    const colors = buildCategoryColors([share("a"), share("b")]);

    expect(colors.get("a")).toBe(seriesColor(0));
    expect(colors.get("b")).toBe(seriesColor(1));
  });

  it("gives the rolled-up tail chrome rather than a hue of its own", () => {
    const colors = buildCategoryColors([share("a"), share("other", true)]);

    expect(colors.get("other")).toBe(OTHER_CATEGORY_COLOR);
  });

  it("knows nothing about a category that was never spent on", () => {
    const colors = buildCategoryColors([share("a")]);

    expect(colors.has("b")).toBe(false);
  });
});
