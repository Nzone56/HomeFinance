import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { content } from "@/content/es";
import type { MonthSummary } from "@/lib/calculations/dashboard";

import { SpendingVsIncome } from "./spending-vs-income";

function summaryOf(overrides: Partial<MonthSummary> = {}): MonthSummary {
  return {
    month: "2026-09",
    monthProgress: 40,
    income: { planned: 8_000_000, actual: 4_000_000, difference: -4_000_000 },
    expenses: { planned: 2_900_000, actual: 1_000_000, difference: -1_900_000 },
    remaining: { planned: 5_100_000, actual: 3_000_000, difference: -2_100_000 },
    categoryPlan: [],
    incomeByUser: [],
    contributions: [],
    people: [],
    breakdown: { household: 0, householdPercentage: 0, personal: [], personalTotal: 0, total: 0 },
    creditCards: [],
    ...overrides,
  };
}

describe("SpendingVsIncome", () => {
  it("leads with how much of what came in has gone", () => {
    render(<SpendingVsIncome summary={summaryOf()} />);

    // 1.000.000 of 4.000.000.
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: content.dashboard.incomeSpent })).toBeInTheDocument();
  });

  it("measures against recorded income, not against the plan", () => {
    // The ring used to read 100% "sobre el plan" for a month that spent exactly
    // its plan, whatever had come in (regression).
    render(
      <SpendingVsIncome
        summary={summaryOf({
          expenses: { planned: 1_000_000, actual: 1_000_000, difference: 0 },
        })}
      />,
    );

    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("de $ 4.000.000 de ingresos")).toBeInTheDocument();
    expect(screen.queryByText(/planeado/)).not.toBeInTheDocument();
  });

  it("says how far through the month we are, which is what makes the figure readable", () => {
    render(<SpendingVsIncome summary={summaryOf()} />);

    expect(screen.getByText("40% del mes transcurrido")).toBeInTheDocument();
  });

  it("calls out a month that has spent more than came in", () => {
    render(
      <SpendingVsIncome
        summary={summaryOf({
          expenses: { planned: 2_000_000, actual: 5_000_000, difference: 3_000_000 },
        })}
      />,
    );

    expect(screen.getByText("125%")).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.overIncome)).toBeInTheDocument();
  });

  it("stays calm while spending is within what came in", () => {
    render(<SpendingVsIncome summary={summaryOf()} />);

    expect(screen.getByText(content.dashboard.withinIncome)).toBeInTheDocument();
    expect(screen.queryByText(content.dashboard.overIncome)).not.toBeInTheDocument();
  });

  it("shows no ring at all when no income has been recorded", () => {
    const { container } = render(
      <SpendingVsIncome
        summary={summaryOf({
          income: { planned: 8_000_000, actual: 0, difference: -8_000_000 },
          expenses: { planned: 2_900_000, actual: 160_000, difference: -2_740_000 },
        })}
      />,
    );

    // Expected income is not money in hand, and a ring of nothing is worse than none.
    expect(container.querySelector("svg circle")).toBeNull();
    expect(screen.getByText(content.dashboard.incomeSpentEmpty)).toBeInTheDocument();
    expect(screen.queryByText(/del mes transcurrido/)).not.toBeInTheDocument();
  });

  it("still shows what has gone out, and offers the one thing that would help", () => {
    render(
      <SpendingVsIncome
        summary={summaryOf({
          income: { planned: 0, actual: 0, difference: 0 },
          expenses: { planned: 0, actual: 160_000, difference: 160_000 },
        })}
      />,
    );

    expect(screen.getByText("$ 160.000")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: content.dashboard.goToIncome })).toHaveAttribute(
      "href",
      "/income",
    );
  });
});
