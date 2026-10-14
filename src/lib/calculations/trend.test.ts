import { describe, expect, it } from "vitest";

import { makeExpense, makeIncome } from "@/test/factories";

import { buildMonthlyTrend, trendPeak } from "./trend";

describe("buildMonthlyTrend", () => {
  it("returns the months leading up to the one asked for, oldest first", () => {
    const points = buildMonthlyTrend([], [], "2026-09", 4);

    expect(points.map((point) => point.month)).toEqual([
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("crosses the year boundary", () => {
    expect(buildMonthlyTrend([], [], "2027-01", 3).map((point) => point.month)).toEqual([
      "2026-11",
      "2026-12",
      "2027-01",
    ]);
  });

  it("totals income and expenses in each month", () => {
    const points = buildMonthlyTrend(
      [makeExpense({ amount: 100_000, occurred_on: "2026-09-05" })],
      [makeIncome({ amount: 400_000, occurred_on: "2026-09-01" })],
      "2026-09",
      2,
    );

    expect(points.at(0)).toMatchObject({ month: "2026-08", income: 0, expenses: 0 });
    expect(points.at(1)).toMatchObject({
      month: "2026-09",
      income: 400_000,
      expenses: 100_000,
      remaining: 300_000,
    });
  });

  it("reports a month that ran at a loss", () => {
    const points = buildMonthlyTrend(
      [makeExpense({ amount: 500_000, occurred_on: "2026-09-05" })],
      [makeIncome({ amount: 200_000, occurred_on: "2026-09-01" })],
      "2026-09",
      1,
    );

    expect(points.at(0)?.remaining).toBe(-300_000);
  });

  it("counts a spread bill in every month it covers", () => {
    const water = makeExpense({
      amount: 160_000,
      occurred_on: "2026-08-11",
      installments: 2,
    });

    const points = buildMonthlyTrend([water], [], "2026-09", 2);

    expect(points.map((point) => point.expenses)).toEqual([80_000, 80_000]);
  });

  it("ignores an expense that has been switched off", () => {
    const points = buildMonthlyTrend(
      [makeExpense({ amount: 100_000, occurred_on: "2026-09-05", active: false })],
      [],
      "2026-09",
      1,
    );

    expect(points.at(0)?.expenses).toBe(0);
  });

  it("returns nothing when asked for no months", () => {
    expect(buildMonthlyTrend([], [], "2026-09", 0)).toEqual([]);
    expect(buildMonthlyTrend([], [], "2026-09", -1)).toEqual([]);
  });
});

describe("trendPeak", () => {
  it("finds the largest figure either series reaches", () => {
    const points = [
      { month: "2026-08", income: 400_000, expenses: 900_000, remaining: -500_000 },
      { month: "2026-09", income: 700_000, expenses: 100_000, remaining: 600_000 },
    ];

    expect(trendPeak(points)).toBe(900_000);
  });

  it("is zero for an empty or idle trend", () => {
    expect(trendPeak([])).toBe(0);
    expect(trendPeak([{ month: "2026-09", income: 0, expenses: 0, remaining: 0 }])).toBe(0);
  });
});
