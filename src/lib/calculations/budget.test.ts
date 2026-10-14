import { describe, expect, it } from "vitest";

import {
  makeBudgetOverride,
  makeBudgetTemplateItem,
  makeCategory,
  makeExpense,
} from "@/test/factories";

import {
  addPlanned,
  buildCategoryPlan,
  overriddenCategoryIds,
  recurringByCategory,
  resolvePlannedByCategory,
  totalActual,
  totalPlanned,
  withActivity,
} from "./budget";

describe("resolvePlannedByCategory", () => {
  const template = [
    makeBudgetTemplateItem({ category_id: "rent", amount: 1_500_000 }),
    makeBudgetTemplateItem({ category_id: "groceries", amount: 800_000 }),
  ];

  it("falls back to the global template when the month says nothing", () => {
    const planned = resolvePlannedByCategory(template, [], "2026-09");

    expect(planned.get("rent")).toBe(1_500_000);
    expect(planned.get("groceries")).toBe(800_000);
  });

  it("lets a month override the template without changing it", () => {
    const overrides = [
      makeBudgetOverride({ month: "2026-09-01", category_id: "groceries", amount: 950_000 }),
    ];

    const september = resolvePlannedByCategory(template, overrides, "2026-09");
    const october = resolvePlannedByCategory(template, overrides, "2026-10");

    expect(september.get("groceries")).toBe(950_000);
    expect(october.get("groceries")).toBe(800_000);
    expect(template[1]?.amount).toBe(800_000);
  });

  it("ignores overrides belonging to another month", () => {
    const overrides = [
      makeBudgetOverride({ month: "2026-08-01", category_id: "rent", amount: 9_000_000 }),
    ];

    expect(resolvePlannedByCategory(template, overrides, "2026-09").get("rent")).toBe(1_500_000);
  });

  it("lets a month drop a category by overriding it to zero", () => {
    const overrides = [makeBudgetOverride({ month: "2026-09-01", category_id: "rent", amount: 0 })];

    expect(resolvePlannedByCategory(template, overrides, "2026-09").get("rent")).toBe(0);
  });

  it("plans nothing when there is no template at all", () => {
    expect(resolvePlannedByCategory([], [], "2026-09").size).toBe(0);
  });

  it("lets a month plan a category the template never mentions", () => {
    const overrides = [
      makeBudgetOverride({ month: "2026-09-01", category_id: "health", amount: 200_000 }),
    ];

    expect(resolvePlannedByCategory([], overrides, "2026-09").get("health")).toBe(200_000);
  });

  it("applies a template version only from the month it takes effect", () => {
    // Planned in September: August was already gone and must not change.
    const september = [
      makeBudgetTemplateItem({
        category_id: "rent",
        amount: 1_500_000,
        effective_from: "2026-09-01",
      }),
    ];

    expect(resolvePlannedByCategory(september, [], "2026-08").has("rent")).toBe(false);
    expect(resolvePlannedByCategory(september, [], "2026-09").get("rent")).toBe(1_500_000);
    expect(resolvePlannedByCategory(september, [], "2027-01").get("rent")).toBe(1_500_000);
  });

  it("uses the latest version in effect, so a later change leaves earlier months alone", () => {
    // Newest first, so the latest version has to win on its date, not its position.
    const versions = [
      makeBudgetTemplateItem({
        category_id: "rent",
        amount: 1_800_000,
        effective_from: "2026-11-01",
      }),
      makeBudgetTemplateItem({
        category_id: "rent",
        amount: 1_500_000,
        effective_from: "2026-09-01",
      }),
    ];

    expect(resolvePlannedByCategory(versions, [], "2026-10").get("rent")).toBe(1_500_000);
    expect(resolvePlannedByCategory(versions, [], "2026-11").get("rent")).toBe(1_800_000);
    expect(resolvePlannedByCategory(versions, [], "2027-02").get("rent")).toBe(1_800_000);
  });
});

describe("recurringByCategory", () => {
  const netflix = makeExpense({
    category_id: "subscriptions",
    amount: 45_000,
    occurred_on: "2026-08-05",
    repeat_months: 1,
  });
  const spotify = makeExpense({
    category_id: "subscriptions",
    amount: 20_000,
    occurred_on: "2026-09-02",
    repeat_months: 1,
  });

  it("plans a category from the expenses that repeat in it", () => {
    expect(recurringByCategory([netflix, spotify], "2026-09").get("subscriptions")).toBe(65_000);
  });

  it("counts a repeating expense only from the month it starts", () => {
    expect(recurringByCategory([netflix, spotify], "2026-08").get("subscriptions")).toBe(45_000);
  });

  it("uses each expense's share of the month, as the actual spending does", () => {
    // A water bill every two months that covers two months: half in each.
    const water = makeExpense({
      category_id: "utilities",
      amount: 160_000,
      occurred_on: "2026-09-01",
      installments: 2,
      repeat_months: 2,
    });

    expect(recurringByCategory([water], "2026-10").get("utilities")).toBe(80_000);
  });

  it("leaves out one-off purchases and anything switched off", () => {
    const oneOff = makeExpense({ category_id: "subscriptions", occurred_on: "2026-09-10" });
    const cancelled = { ...spotify, active: false };

    expect(recurringByCategory([oneOff, cancelled], "2026-09").size).toBe(0);
  });
});

describe("addPlanned", () => {
  it("adds the repeating expenses on top of what was typed into the plan", () => {
    const typed = new Map([
      ["subscriptions", 10_000],
      ["groceries", 800_000],
    ]);
    const recurring = new Map([
      ["subscriptions", 65_000],
      ["rent", 1_500_000],
    ]);

    expect(addPlanned(typed, recurring)).toEqual(
      new Map([
        ["subscriptions", 75_000],
        ["groceries", 800_000],
        ["rent", 1_500_000],
      ]),
    );
  });

  it("leaves the typed plan untouched when nothing repeats", () => {
    const typed = new Map([["groceries", 800_000]]);

    expect(addPlanned(typed, new Map())).toEqual(typed);
  });
});

describe("overriddenCategoryIds", () => {
  it("lists only the categories this month overrides", () => {
    const overrides = [
      makeBudgetOverride({ month: "2026-09-01", category_id: "rent" }),
      makeBudgetOverride({ month: "2026-10-01", category_id: "groceries" }),
    ];

    expect([...overriddenCategoryIds(overrides, "2026-09")]).toEqual(["rent"]);
  });

  it("is empty when the month follows the template exactly", () => {
    expect(overriddenCategoryIds([], "2026-09").size).toBe(0);
  });
});

describe("buildCategoryPlan", () => {
  const categories = [
    makeCategory({ id: "rent", name: "Arriendo", sort_order: 10 }),
    makeCategory({ id: "groceries", name: "Mercado", sort_order: 20 }),
  ];

  it("pairs planned against actual for each category", () => {
    const rows = buildCategoryPlan(
      categories,
      new Map([
        ["rent", 1_500_000],
        ["groceries", 800_000],
      ]),
      new Map([
        ["rent", 1_500_000],
        ["groceries", 920_000],
      ]),
    );

    expect(rows).toEqual([
      {
        categoryId: "rent",
        categoryName: "Arriendo",
        planned: 1_500_000,
        actual: 1_500_000,
        difference: 0,
        overspend: 0,
        isOverBudget: false,
        percentage: 100,
        isOverridden: false,
      },
      {
        categoryId: "groceries",
        categoryName: "Mercado",
        planned: 800_000,
        actual: 920_000,
        difference: 120_000,
        overspend: 120_000,
        isOverBudget: true,
        percentage: 115,
        isOverridden: false,
      },
    ]);
  });

  it("reports zero for a category with neither a plan nor spending", () => {
    const [row] = buildCategoryPlan([makeCategory({ id: "health" })], new Map(), new Map());

    expect(row?.planned).toBe(0);
    expect(row?.actual).toBe(0);
    expect(row?.isOverBudget).toBe(false);
    expect(row?.percentage).toBe(0);
  });

  it("orders by the household's own ordering, then by name", () => {
    const unordered = [
      makeCategory({ id: "b", name: "Bravo", sort_order: 5 }),
      makeCategory({ id: "a", name: "Alfa", sort_order: 5 }),
      makeCategory({ id: "c", name: "Charlie", sort_order: 1 }),
    ];

    expect(buildCategoryPlan(unordered, new Map(), new Map()).map((row) => row.categoryId)).toEqual(
      ["c", "a", "b"],
    );
  });

  it("hides an archived category", () => {
    const withArchived = [...categories, makeCategory({ id: "old", archived: true })];

    expect(
      buildCategoryPlan(withArchived, new Map(), new Map()).map((row) => row.categoryId),
    ).not.toContain("old");
  });

  it("keeps an archived category that still has spending against it", () => {
    const withArchived = [...categories, makeCategory({ id: "old", archived: true })];

    expect(
      buildCategoryPlan(withArchived, new Map(), new Map([["old", 50_000]])).map(
        (row) => row.categoryId,
      ),
    ).toContain("old");
  });

  it("flags rows the month deliberately overrode", () => {
    const rows = buildCategoryPlan(categories, new Map(), new Map(), new Set(["groceries"]));

    expect(rows.find((row) => row.categoryId === "groceries")?.isOverridden).toBe(true);
    expect(rows.find((row) => row.categoryId === "rent")?.isOverridden).toBe(false);
  });
});

describe("plan totals", () => {
  const rows = buildCategoryPlan(
    [makeCategory({ id: "rent" }), makeCategory({ id: "groceries" })],
    new Map([
      ["rent", 1_500_000],
      ["groceries", 800_000],
    ]),
    new Map([
      ["rent", 1_500_000],
      ["groceries", 920_000],
    ]),
  );

  it("adds the planned column", () => {
    expect(totalPlanned(rows)).toBe(2_300_000);
  });

  it("adds the actual column", () => {
    expect(totalActual(rows)).toBe(2_420_000);
  });

  it("totals an empty plan as zero", () => {
    expect(totalPlanned([])).toBe(0);
    expect(totalActual([])).toBe(0);
  });
});

describe("withActivity", () => {
  it("keeps rows that were planned or spent, and drops the rest", () => {
    const rows = buildCategoryPlan(
      [makeCategory({ id: "rent" }), makeCategory({ id: "spent" }), makeCategory({ id: "quiet" })],
      new Map([["rent", 1_500_000]]),
      new Map([["spent", 10_000]]),
    );

    expect(withActivity(rows).map((row) => row.categoryId)).toEqual(["rent", "spent"]);
  });
});
