import { describe, expect, it } from "vitest";

import { GF, JULIAN, makeExpense } from "@/test/factories";

import { buildExpenseBreakdown } from "./breakdown";

const members = [
  { userId: JULIAN, displayName: "Julián" },
  { userId: GF, displayName: "GF" },
];

describe("buildExpenseBreakdown", () => {
  it("separates household spending from each person's own purchases", () => {
    const expenses = [
      makeExpense({ user_id: JULIAN, amount: 1_500_000, shared: true }),
      makeExpense({ user_id: GF, amount: 500_000, shared: true }),
      makeExpense({ user_id: JULIAN, amount: 200_000, shared: false }),
      makeExpense({ user_id: GF, amount: 300_000, shared: false }),
    ];

    const breakdown = buildExpenseBreakdown(members, expenses);

    expect(breakdown.household).toBe(2_000_000);
    expect(breakdown.personalTotal).toBe(500_000);
    expect(breakdown.total).toBe(2_500_000);
    expect(breakdown.personal).toEqual([
      { userId: JULIAN, displayName: "Julián", amount: 200_000, percentageOfTotal: 8 },
      { userId: GF, displayName: "GF", amount: 300_000, percentageOfTotal: 12 },
    ]);
  });

  it("reports the household's share of the month", () => {
    const expenses = [
      makeExpense({ amount: 750_000, shared: true }),
      makeExpense({ amount: 250_000, shared: false }),
    ];

    expect(buildExpenseBreakdown(members, expenses).householdPercentage).toBe(75);
  });

  it("attributes a personal expense to whoever paid for it", () => {
    const expenses = [makeExpense({ user_id: GF, amount: 300_000, shared: false })];

    const breakdown = buildExpenseBreakdown(members, expenses);

    expect(breakdown.personal.find((row) => row.userId === GF)?.amount).toBe(300_000);
    expect(breakdown.personal.find((row) => row.userId === JULIAN)?.amount).toBe(0);
  });

  it("handles a month that was entirely shared", () => {
    const breakdown = buildExpenseBreakdown(members, [makeExpense({ amount: 100, shared: true })]);

    expect(breakdown.household).toBe(100);
    expect(breakdown.personalTotal).toBe(0);
    expect(breakdown.householdPercentage).toBe(100);
    expect(breakdown.personal.every((row) => row.amount === 0)).toBe(true);
  });

  it("handles a month that was entirely personal", () => {
    const breakdown = buildExpenseBreakdown(members, [makeExpense({ amount: 100, shared: false })]);

    expect(breakdown.household).toBe(0);
    expect(breakdown.personalTotal).toBe(100);
    expect(breakdown.householdPercentage).toBe(0);
  });

  it("reports zeroes for a month with nothing spent", () => {
    const breakdown = buildExpenseBreakdown(members, []);

    expect(breakdown).toMatchObject({
      household: 0,
      personalTotal: 0,
      total: 0,
      householdPercentage: 0,
    });
    expect(breakdown.personal).toHaveLength(2);
  });

  it("returns no personal rows for a household with no members", () => {
    expect(buildExpenseBreakdown([], [makeExpense()]).personal).toEqual([]);
  });

  it("uses the same dividing line as the split, so the two agree", () => {
    // `shared` decides both what gets split and what counts as household spend.
    const expenses = [
      makeExpense({ amount: 400, shared: true }),
      makeExpense({ amount: 600, shared: false }),
    ];

    expect(buildExpenseBreakdown(members, expenses).household).toBe(400);
  });
});
