import { describe, expect, it } from "vitest";

import { makeExpense } from "@/test/factories";

import {
  buildInstallmentPlan,
  expenseShareForMonth,
  expensesForMonth,
  monthlyRateFromAnnualPercent,
} from "./installments";
import { sumAmounts } from "./money";

describe("monthlyRateFromAnnualPercent", () => {
  it("compounds twelve times back to the annual rate", () => {
    const monthly = monthlyRateFromAnnualPercent(28.5);

    expect((1 + monthly) ** 12).toBeCloseTo(1.285, 10);
  });

  it("is not simply the annual rate divided by twelve", () => {
    // 28,5 / 12 would be 2,375%. Compounding makes the true monthly rate lower.
    expect(monthlyRateFromAnnualPercent(28.5)).toBeLessThan(0.02375);
    expect(monthlyRateFromAnnualPercent(28.5)).toBeGreaterThan(0.021);
  });

  it("treats a zero rate as no growth", () => {
    expect(monthlyRateFromAnnualPercent(0)).toBe(0);
  });
});

describe("buildInstallmentPlan", () => {
  it("leaves a single payment alone", () => {
    const plan = buildInstallmentPlan(80_000, 1, null);

    expect(plan.amounts).toEqual([80_000]);
    expect(plan.total).toBe(80_000);
    expect(plan.interest).toBe(0);
  });

  it("splits a bill evenly with no interest", () => {
    const plan = buildInstallmentPlan(160_000, 2, null);

    expect(plan.amounts).toEqual([80_000, 80_000]);
    expect(plan.interest).toBe(0);
  });

  it("never loses a peso when the split is uneven", () => {
    const plan = buildInstallmentPlan(100_001, 3, null);

    expect(sumAmounts(plan.amounts)).toBe(100_001);
    expect(plan.total).toBe(100_001);
    expect(plan.interest).toBe(0);
  });

  it("treats an explicit zero rate as an even split", () => {
    expect(buildInstallmentPlan(160_000, 2, 0).amounts).toEqual([80_000, 80_000]);
  });

  describe("with a rate", () => {
    const plan = buildInstallmentPlan(1_200_000, 12, 28.5);

    it("charges the same cuota every month, as a bank does", () => {
      expect(plan.amounts).toHaveLength(12);
      expect(new Set(plan.amounts).size).toBe(1);
    });

    it("costs more than the purchase price", () => {
      expect(plan.total).toBeGreaterThan(1_200_000);
      expect(plan.interest).toBe(plan.total - 1_200_000);
    });

    it("is a true annuity: the cuotas discount back to the purchase price", () => {
      const monthly = monthlyRateFromAnnualPercent(28.5);
      const presentValue = plan.amounts.reduce(
        (total, cuota, index) => total + cuota / (1 + monthly) ** (index + 1),
        0,
      );

      expect(presentValue).toBeCloseTo(1_200_000, 0);
    });

    it("charges more interest the longer the plan runs", () => {
      const shorter = buildInstallmentPlan(1_200_000, 6, 28.5);

      expect(plan.interest).toBeGreaterThan(shorter.interest);
    });
  });

  describe("amountAt", () => {
    const plan = buildInstallmentPlan(160_000, 2, null);

    it("reads a charge by position", () => {
      expect(plan.amountAt(0)).toBe(80_000);
      expect(plan.amountAt(1)).toBe(80_000);
    });

    it("reports nothing outside the plan", () => {
      expect(plan.amountAt(2)).toBe(0);
      expect(plan.amountAt(-1)).toBe(0);
    });
  });
});

describe("expenseShareForMonth", () => {
  it("puts a one-off expense in its own month only", () => {
    const expense = makeExpense({ amount: 80_000, occurred_on: "2026-09-11" });

    expect(expenseShareForMonth(expense, "2026-09")?.amount).toBe(80_000);
    expect(expenseShareForMonth(expense, "2026-10")).toBeNull();
    expect(expenseShareForMonth(expense, "2026-08")).toBeNull();
  });

  it("splits a bill that covers two months", () => {
    const water = makeExpense({ amount: 160_000, occurred_on: "2026-09-11", installments: 2 });

    expect(expenseShareForMonth(water, "2026-09")?.amount).toBe(80_000);
    expect(expenseShareForMonth(water, "2026-10")?.amount).toBe(80_000);
    expect(expenseShareForMonth(water, "2026-11")).toBeNull();
  });

  it("numbers each share within its plan", () => {
    const water = makeExpense({ amount: 160_000, occurred_on: "2026-09-11", installments: 2 });

    expect(expenseShareForMonth(water, "2026-10")).toMatchObject({
      installmentIndex: 2,
      installmentCount: 2,
      fullAmount: 160_000,
      hasInterest: false,
    });
  });

  it("repeats a fixed bill every month", () => {
    const rent = makeExpense({ amount: 1_500_000, occurred_on: "2026-09-01", repeat_months: 1 });

    for (const month of ["2026-09", "2026-10", "2027-03"]) {
      expect(expenseShareForMonth(rent, month)?.amount).toBe(1_500_000);
    }
    expect(expenseShareForMonth(rent, "2026-08")).toBeNull();
  });

  it("gives a bimonthly bill continuous monthly coverage", () => {
    // Arrives every two months and covers two months, so every month is $80.000.
    const water = makeExpense({
      amount: 160_000,
      occurred_on: "2026-09-11",
      installments: 2,
      repeat_months: 2,
    });

    for (const month of ["2026-09", "2026-10", "2026-11", "2026-12", "2027-01"]) {
      expect(expenseShareForMonth(water, month)?.amount).toBe(80_000);
    }
  });

  it("stops repeating once it is cancelled", () => {
    const subscription = makeExpense({
      amount: 40_000,
      occurred_on: "2026-09-05",
      repeat_months: 1,
      repeat_until: "2026-11-30",
    });

    expect(expenseShareForMonth(subscription, "2026-11")?.amount).toBe(40_000);
    expect(expenseShareForMonth(subscription, "2026-12")).toBeNull();
  });

  it("charges a cuota in each month of a card purchase", () => {
    const tv = makeExpense({
      amount: 1_200_000,
      occurred_on: "2026-09-20",
      installments: 12,
      annual_rate_percent: 28.5,
    });

    const first = expenseShareForMonth(tv, "2026-09");
    const last = expenseShareForMonth(tv, "2027-08");

    expect(first?.amount).toBe(last?.amount);
    expect(first?.amount).toBeGreaterThan(100_000);
    expect(first?.hasInterest).toBe(true);
    expect(first?.fullAmount).toBe(1_200_000);
    expect(expenseShareForMonth(tv, "2027-09")).toBeNull();
  });

  it("sums overlapping occurrences that genuinely coincide", () => {
    // Spans three months but arrives every two, so the third month of one
    // occurrence overlaps the first of the next.
    const overlapping = makeExpense({
      amount: 300_000,
      occurred_on: "2026-09-01",
      installments: 3,
      repeat_months: 2,
    });

    expect(expenseShareForMonth(overlapping, "2026-09")?.amount).toBe(100_000);
    expect(expenseShareForMonth(overlapping, "2026-11")?.amount).toBe(200_000);
  });

  it("crosses the year boundary", () => {
    const expense = makeExpense({ amount: 200_000, occurred_on: "2026-12-15", installments: 2 });

    expect(expenseShareForMonth(expense, "2027-01")?.amount).toBe(100_000);
  });
});

describe("expensesForMonth", () => {
  it("returns only what lands in that month", () => {
    const expenses = [
      makeExpense({ amount: 100_000, occurred_on: "2026-09-01" }),
      makeExpense({ amount: 200_000, occurred_on: "2026-10-01" }),
      makeExpense({ amount: 160_000, occurred_on: "2026-09-01", installments: 2 }),
    ];

    const september = expensesForMonth(expenses, "2026-09");

    expect(september.map((share) => share.amount)).toEqual([100_000, 80_000]);
  });

  it("returns nothing for a quiet month", () => {
    expect(expensesForMonth([makeExpense({ occurred_on: "2026-09-01" })], "2026-11")).toEqual([]);
  });
});
