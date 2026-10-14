import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { content } from "@/content/es";
import type { MonthSummary } from "@/lib/calculations/dashboard";
import { buildCategoryShares } from "@/lib/calculations/category-share";
import { buildCategoryColors } from "@/lib/ui/category-colors";
import { buildMemberColors } from "@/lib/ui/member-colors";
import { GF, JULIAN } from "@/test/factories";

import type { CreditCardStatus } from "@/lib/calculations/credit-cards";

import { CategoryDonut } from "./category-donut";
import { DashboardHeader } from "./dashboard-header";
import { HeadlineCards } from "./headline-cards";
import { IncomeProgress } from "./income-progress";
import { MonthlyComparison } from "./monthly-comparison";
import { UpcomingPayments } from "./upcoming-payments";

function summaryOf(overrides: Partial<MonthSummary> = {}): MonthSummary {
  return {
    month: "2026-09",
    monthProgress: 40,
    income: { planned: 8_000_000, actual: 7_400_000, difference: -600_000 },
    expenses: { planned: 3_500_000, actual: 3_200_000, difference: -300_000 },
    remaining: { planned: 4_500_000, actual: 4_200_000, difference: -300_000 },
    categoryPlan: [],
    incomeByUser: [],
    contributions: [],
    people: [],
    breakdown: { household: 0, householdPercentage: 0, personal: [], personalTotal: 0, total: 0 },
    creditCards: [],
    ...overrides,
  };
}

describe("DashboardHeader", () => {
  it("greets whoever is looking at it", () => {
    render(<DashboardHeader name="Julián" month="2026-09" currentMonth="2026-09" planUsed={40} />);

    expect(screen.getByRole("heading", { name: "¡Hola, Julián!", level: 1 })).toBeInTheDocument();
  });

  it("says all is well while spending is inside the plan", () => {
    render(<DashboardHeader name="Julián" month="2026-09" currentMonth="2026-09" planUsed={40} />);

    expect(screen.getByText(content.dashboard.allGood)).toBeInTheDocument();
    expect(screen.getByText("Septiembre 2026")).toBeInTheDocument();
  });

  it("warns as the plan runs out", () => {
    render(<DashboardHeader name="Julián" month="2026-09" currentMonth="2026-09" planUsed={92} />);

    expect(screen.getByText(content.dashboard.closeToPlan)).toBeInTheDocument();
  });

  it("says so once the plan is gone", () => {
    render(<DashboardHeader name="Julián" month="2026-09" currentMonth="2026-09" planUsed={140} />);

    expect(screen.getByText(content.dashboard.overBudget)).toBeInTheDocument();
  });

  it("withholds a verdict when there is no plan to judge against", () => {
    render(
      <DashboardHeader name="Julián" month="2026-09" currentMonth="2026-09" planUsed={null} />,
    );

    expect(screen.getByText(content.dashboard.budgetEmpty)).toBeInTheDocument();
    expect(screen.queryByText(content.dashboard.allGood)).not.toBeInTheDocument();
  });

  it("flags a month already gone, with one click back to now", () => {
    render(<DashboardHeader name="Julián" month="2026-07" currentMonth="2026-09" planUsed={40} />);

    expect(screen.getByText(content.month.past)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: content.month.current })).toHaveAttribute(
      "href",
      "/dashboard?month=2026-09",
    );
  });

  it("flags a month not here yet", () => {
    render(<DashboardHeader name="Julián" month="2026-12" currentMonth="2026-09" planUsed={40} />);

    expect(screen.getByText(content.month.future)).toBeInTheDocument();
  });

  it("reads December against January of the next year as past, not future", () => {
    // Comparing the keys as strings would get this one backwards.
    render(<DashboardHeader name="Julián" month="2025-12" currentMonth="2026-01" planUsed={40} />);

    expect(screen.getByText(content.month.past)).toBeInTheDocument();
  });
});

describe("HeadlineCards", () => {
  it("shows each figure against its plan", () => {
    render(<HeadlineCards summary={summaryOf()} />);

    expect(screen.getByText(content.dashboard.income)).toBeInTheDocument();
    expect(screen.getByText("$ 7.400.000")).toBeInTheDocument();
    expect(screen.getByText("Plan: $ 8.000.000")).toBeInTheDocument();
  });

  it("reads a shortfall in income and a rise in expenses as bad news alike", () => {
    render(<HeadlineCards summary={summaryOf()} />);

    // Income short of plan is bad; expenses under plan is good.
    const differences = screen.getAllByText("-$ 300.000");
    expect(differences.at(0)).toHaveClass("text-emerald-600");
    expect(screen.getByText("-$ 600.000")).toHaveClass("text-destructive");
  });

  it("shows what the household spent together, beside what was personal", () => {
    render(
      <HeadlineCards
        summary={summaryOf({
          breakdown: {
            household: 2_000_000,
            householdPercentage: 80,
            personal: [],
            personalTotal: 500_000,
            total: 2_500_000,
          },
        })}
      />,
    );

    expect(screen.getByText(content.dashboard.householdCard)).toBeInTheDocument();
    expect(screen.getByText("$ 2.000.000")).toBeInTheDocument();
    expect(screen.getByText("80% de los gastos del mes")).toBeInTheDocument();
    expect(screen.getByText("$ 500.000")).toBeInTheDocument();
  });

  it("never talks about anyone owing anyone", () => {
    render(<HeadlineCards summary={summaryOf()} />);

    expect(screen.queryByText(/le debe/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

describe("MonthlyComparison", () => {
  it("plots all three figures, planned against actual", () => {
    render(<MonthlyComparison summary={summaryOf()} />);

    expect(
      screen.getByRole("img", { name: content.dashboard.monthlyComparison }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("$8 M").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$3,2 M").length).toBeGreaterThan(0);
  });
});

describe("CategoryDonut", () => {
  const rows = [
    { categoryId: "rent", categoryName: "Arriendo", actual: 1_500_000 },
    { categoryId: "food", categoryName: "Mercado", actual: 500_000 },
  ].map((row) => ({
    ...row,
    planned: 0,
    difference: row.actual,
    overspend: row.actual,
    isOverBudget: true,
    percentage: 0,
    isOverridden: false,
  }));

  it("names every slice with its amount and share", () => {
    const shares = buildCategoryShares(rows, content.dashboard.otherCategories, 5);
    render(<CategoryDonut shares={shares} colors={buildCategoryColors(shares)} />);

    // Once in the legend, once as the slice's own hover title.
    expect(screen.getAllByText("Arriendo")).toHaveLength(2);
    expect(screen.getByText("$ 1.500.000")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("puts the total in the middle", () => {
    const shares = buildCategoryShares(rows, content.dashboard.otherCategories, 5);
    render(<CategoryDonut shares={shares} colors={buildCategoryColors(shares)} />);

    expect(screen.getByText("$2 M")).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.totalSpent)).toBeInTheDocument();
  });

  it("lets the legend shrink with the card instead of clipping the percentages (regression)", () => {
    const shares = buildCategoryShares(rows, content.dashboard.otherCategories, 5);
    render(<CategoryDonut shares={shares} colors={buildCategoryColors(shares)} />);

    const legend = screen.getAllByRole("list").at(-1);
    expect(legend).toHaveClass("min-w-0");
    expect(legend?.parentElement).toHaveClass("@md:grid-cols-[auto_1fr]");
  });

  it("says so when nothing has been spent yet", () => {
    render(<CategoryDonut shares={[]} colors={new Map()} />);

    expect(screen.getByText(content.dashboard.byCategoryEmpty)).toBeInTheDocument();
  });
});

describe("IncomeProgress", () => {
  it("shows what arrived against what was expected, per person", () => {
    render(
      <IncomeProgress
        colors={buildMemberColors([{ userId: JULIAN }, { userId: GF }])}
        rows={[
          {
            userId: JULIAN,
            displayName: "Julián",
            expected: 4_500_000,
            actual: 4_200_000,
            difference: -300_000,
          },
        ]}
      />,
    );

    expect(screen.getByText("Julián")).toBeInTheDocument();
    expect(screen.getByText("$ 4.200.000")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Julián" })).toHaveAttribute("aria-valuenow", "93");
  });
});

describe("UpcomingPayments", () => {
  const noStatement = {
    closingDate: new Date(2026, 7, 15),
    dueDate: new Date(2026, 8, 5),
    unpaid: 0,
    overdue: false,
  };

  const statusOf = (
    id: string,
    name: string,
    cycleOwed: number,
    dueDate: Date,
    statement: CreditCardStatus["statement"] = noStatement,
    closingDate = new Date(2026, 8, 15),
  ): CreditCardStatus => ({
    card: {
      id,
      userId: JULIAN,
      name,
      creditLimit: 5_000_000,
      closingDay: 15,
      dueDay: 5,
      openingDebt: 0,
    },
    used: cycleOwed + statement.unpaid,
    available: 5_000_000 - cycleOwed - statement.unpaid,
    utilization: 10,
    currentCycleTotal: 0,
    closingDate,
    dueDate,
    cycleOwed,
    statement,
  });

  it("shows a closed statement and the cycle after it as two bills, each on its own date (regression)", () => {
    // All the debt used to sit against the later date.
    render(
      <UpcomingPayments
        statuses={[
          statusOf(
            "nu",
            "CC Nu",
            0,
            new Date(2026, 10, 3),
            {
              closingDate: new Date(2026, 8, 13),
              dueDate: new Date(2026, 9, 3),
              unpaid: 170_000,
              overdue: false,
            },
            new Date(2026, 9, 13),
          ),
        ]}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows.at(0)).toHaveTextContent("3 oct · cerró el 13 sep");
    expect(rows.at(0)).toHaveTextContent("$ 170.000");
    expect(rows.at(1)).toHaveTextContent("3 nov · cierra el 13 oct");
    expect(rows.at(1)).toHaveTextContent("$ 0");
    expect(screen.queryByText(content.creditCard.overdue)).not.toBeInTheDocument();
  });

  it("calls out a closed statement still unpaid after its due date", () => {
    render(
      <UpcomingPayments
        statuses={[
          statusOf("nu", "CC Nu", 0, new Date(2026, 10, 3), {
            closingDate: new Date(2026, 8, 13),
            dueDate: new Date(2026, 9, 3),
            unpaid: 170_000,
            overdue: true,
          }),
        ]}
      />,
    );

    expect(screen.getByText(content.creditCard.overdue)).toBeInTheDocument();
  });

  it("lists what lands next, soonest first", () => {
    render(
      <UpcomingPayments
        statuses={[
          statusOf("b", "TC 2", 0, new Date(2026, 9, 10)),
          statusOf("a", "TC 1", 330_000, new Date(2026, 9, 5)),
        ]}
      />,
    );

    const rows = screen.getAllByRole("listitem");
    expect(rows.at(0)).toHaveTextContent("TC 1");
    expect(rows.at(1)).toHaveTextContent("TC 2");
  });

  it("says so when there is nothing to pay", () => {
    render(<UpcomingPayments statuses={[]} />);

    expect(screen.getByText(content.dashboard.upcomingPaymentsEmpty)).toBeInTheDocument();
  });
});
