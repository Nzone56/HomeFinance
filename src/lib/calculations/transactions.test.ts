import { describe, expect, it } from "vitest";

import { makeExpense } from "@/test/factories";

import {
  activeOnly,
  amountFor,
  filterByMonth,
  filterUpToMonth,
  totalAmount,
  totalsBy,
} from "./transactions";

describe("filterByMonth", () => {
  const expenses = [
    makeExpense({ occurred_on: "2026-08-31", amount: 1 }),
    makeExpense({ occurred_on: "2026-09-01", amount: 2 }),
    makeExpense({ occurred_on: "2026-09-30", amount: 3 }),
    makeExpense({ occurred_on: "2026-10-01", amount: 4 }),
  ];

  it("keeps only the selected month, boundaries included", () => {
    expect(filterByMonth(expenses, "2026-09").map((expense) => expense.amount)).toEqual([2, 3]);
  });

  it("returns nothing for a month with no activity", () => {
    expect(filterByMonth(expenses, "2026-11")).toEqual([]);
  });

  it("returns nothing for an empty list", () => {
    expect(filterByMonth([], "2026-09")).toEqual([]);
  });
});

describe("filterUpToMonth", () => {
  const expenses = [
    makeExpense({ occurred_on: "2026-07-15", amount: 1 }),
    makeExpense({ occurred_on: "2026-09-30", amount: 2 }),
    makeExpense({ occurred_on: "2026-10-01", amount: 3 }),
  ];

  it("keeps everything on or before the end of the month", () => {
    expect(filterUpToMonth(expenses, "2026-09").map((expense) => expense.amount)).toEqual([1, 2]);
  });

  it("keeps nothing recorded before the first month", () => {
    expect(filterUpToMonth(expenses, "2026-06")).toEqual([]);
  });

  it("crosses the year boundary correctly", () => {
    const acrossYears = [
      makeExpense({ occurred_on: "2025-12-31", amount: 1 }),
      makeExpense({ occurred_on: "2026-01-01", amount: 2 }),
    ];

    expect(filterUpToMonth(acrossYears, "2025-12").map((expense) => expense.amount)).toEqual([1]);
  });
});

describe("activeOnly", () => {
  it("drops anything switched off", () => {
    const expenses = [
      makeExpense({ amount: 100, active: true }),
      makeExpense({ amount: 999, active: false }),
      makeExpense({ amount: 200, active: true }),
    ];

    expect(activeOnly(expenses).map((expense) => expense.amount)).toEqual([100, 200]);
  });

  it("keeps everything when nothing is switched off", () => {
    expect(activeOnly([makeExpense(), makeExpense()])).toHaveLength(2);
  });

  it("returns nothing when everything is switched off", () => {
    expect(activeOnly([makeExpense({ active: false })])).toEqual([]);
  });

  it("handles an empty list", () => {
    expect(activeOnly([])).toEqual([]);
  });
});

describe("totalAmount", () => {
  it("adds every amount", () => {
    expect(totalAmount([{ amount: 80_000 }, { amount: 230_000 }])).toBe(310_000);
  });

  it("treats an empty list as zero", () => {
    expect(totalAmount([])).toBe(0);
  });
});

describe("totalsBy", () => {
  it("groups amounts by the chosen key", () => {
    const expenses = [
      makeExpense({ category_id: "food", amount: 100 }),
      makeExpense({ category_id: "food", amount: 250 }),
      makeExpense({ category_id: "rent", amount: 900 }),
    ];

    const totals = totalsBy(expenses, (expense) => expense.category_id);

    expect(totals.get("food")).toBe(350);
    expect(totals.get("rent")).toBe(900);
    expect(totals.size).toBe(2);
  });

  it("returns an empty map for no rows", () => {
    expect(totalsBy([], (item: { amount: number }) => String(item.amount)).size).toBe(0);
  });
});

describe("amountFor", () => {
  it("reads a present total", () => {
    expect(amountFor(new Map([["food", 350]]), "food")).toBe(350);
  });

  it("reports zero for a group that recorded nothing", () => {
    expect(amountFor(new Map([["food", 350]]), "rent")).toBe(0);
  });
});
