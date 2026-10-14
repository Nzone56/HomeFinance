import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { content } from "@/content/es";
import { buildExpenseBreakdown } from "@/lib/calculations/breakdown";
import { GF, JULIAN, makeExpense } from "@/test/factories";

import { BreakdownCard } from "./breakdown-card";

const members = [
  { userId: JULIAN, displayName: "Julián" },
  { userId: GF, displayName: "GF" },
];

const breakdownOf = (expenses: Parameters<typeof buildExpenseBreakdown>[1]) =>
  buildExpenseBreakdown(members, expenses);

describe("BreakdownCard", () => {
  it("shows household spending against each person's own purchases", () => {
    render(
      <BreakdownCard
        breakdown={breakdownOf([
          makeExpense({ amount: 2_000_000, shared: true }),
          makeExpense({ user_id: JULIAN, amount: 200_000, shared: false }),
          makeExpense({ user_id: GF, amount: 300_000, shared: false }),
        ])}
      />,
    );

    expect(screen.getByText(content.dashboard.householdSpend)).toBeInTheDocument();
    expect(screen.getByText("$ 2.000.000")).toBeInTheDocument();
    expect(screen.getByText("Julián")).toBeInTheDocument();
    expect(screen.getByText("GF")).toBeInTheDocument();
  });

  it("gives every segment a name and a share, so colour is never the only signal", () => {
    render(
      <BreakdownCard
        breakdown={breakdownOf([
          makeExpense({ amount: 750_000, shared: true }),
          makeExpense({ user_id: JULIAN, amount: 250_000, shared: false }),
        ])}
      />,
    );

    const list = screen.getByRole("list");
    expect(within(list).getByText("75%")).toBeInTheDocument();
    expect(within(list).getByText("25%")).toBeInTheDocument();
  });

  it("leaves out a person who bought nothing for themselves", () => {
    render(
      <BreakdownCard
        breakdown={breakdownOf([
          makeExpense({ amount: 1_000_000, shared: true }),
          makeExpense({ user_id: GF, amount: 300_000, shared: false }),
        ])}
      />,
    );

    const list = screen.getByRole("list");
    expect(within(list).getByText("GF")).toBeInTheDocument();
    expect(within(list).queryByText("Julián")).not.toBeInTheDocument();
  });

  it("labels the bar for anyone who cannot see it", () => {
    render(<BreakdownCard breakdown={breakdownOf([makeExpense({ amount: 100, shared: true })])} />);

    expect(screen.getByRole("img", { name: content.dashboard.breakdown })).toBeInTheDocument();
  });

  it("totals what was spent on individual purchases", () => {
    render(
      <BreakdownCard
        breakdown={breakdownOf([
          makeExpense({ amount: 1_000_000, shared: true }),
          makeExpense({ user_id: JULIAN, amount: 200_000, shared: false }),
          makeExpense({ user_id: GF, amount: 300_000, shared: false }),
        ])}
      />,
    );

    expect(screen.getByText(content.dashboard.personalSpend)).toBeInTheDocument();
    expect(screen.getByText("$ 500.000")).toBeInTheDocument();
  });

  it("says so when nothing has been spent yet", () => {
    render(<BreakdownCard breakdown={breakdownOf([])} />);

    expect(screen.getByText(content.dashboard.breakdownEmpty)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
