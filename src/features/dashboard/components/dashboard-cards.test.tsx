import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { content } from "@/content/es";
import { buildCategoryPlan } from "@/lib/calculations/budget";
import { buildCreditCardStatus, type CreditCard } from "@/lib/calculations/credit-cards";
import { GF, JULIAN, makeCategory, makeExpense } from "@/test/factories";

import { ContributionsCard } from "./contributions-card";
import { CreditCardsCard } from "./credit-cards-card";
import { PlanVsActual } from "./plan-vs-actual";
import { RecentExpenses } from "./recent-expenses";
import { buildMemberColors } from "@/lib/ui/member-colors";
import type { ExpenseRow } from "@/types/database";

const labels = {
  categories: new Map([["rent", "Arriendo"]]),
  methods: new Map([["bank", "Bancolombia"]]),
  members: new Map([[JULIAN, "Julián"]]),
  memberColors: buildMemberColors([{ userId: JULIAN }, { userId: GF }]),
};

describe("PlanVsActual", () => {
  const rows = buildCategoryPlan(
    [
      makeCategory({ id: "rent", name: "Arriendo", sort_order: 10 }),
      makeCategory({ id: "food", name: "Mercado", sort_order: 20 }),
    ],
    new Map([
      ["rent", 1_500_000],
      ["food", 800_000],
    ]),
    new Map([
      ["rent", 1_500_000],
      ["food", 920_000],
    ]),
  );

  it("lists each category with its plan and its actual", () => {
    render(<PlanVsActual rows={rows} />);

    expect(screen.getByText("Arriendo")).toBeInTheDocument();
    expect(screen.getByText("Mercado")).toBeInTheDocument();
    expect(screen.getAllByText("$ 1.500.000")).toHaveLength(2);
  });

  it("counts the categories that went over", () => {
    render(<PlanVsActual rows={rows} />);

    expect(screen.getByText("1 de 2 categorías sobre el plan")).toBeInTheDocument();
  });

  it("hides categories with neither a plan nor any spending", () => {
    const quiet = buildCategoryPlan(
      [makeCategory({ id: "q", name: "Silencio" })],
      new Map(),
      new Map(),
    );

    render(<PlanVsActual rows={quiet} />);

    expect(screen.queryByText("Silencio")).not.toBeInTheDocument();
    expect(screen.getByText(content.dashboard.planEmpty)).toBeInTheDocument();
  });

  it("flags a category this month deliberately overrode", () => {
    const overridden = buildCategoryPlan(
      [makeCategory({ id: "rent", name: "Arriendo" })],
      new Map([["rent", 1_000]]),
      new Map(),
      new Set(["rent"]),
    );

    render(<PlanVsActual rows={overridden} />);

    expect(screen.getByText(content.budget.overridden)).toBeInTheDocument();
  });
});

describe("ContributionsCard", () => {
  it("shows each person's part of the month and their share of it", () => {
    render(
      <ContributionsCard
        colors={labels.memberColors}
        rows={[
          {
            userId: JULIAN,
            displayName: "Julián",
            spent: 1_764_000,
            spentShared: 1_764_000,
            spentPersonal: 0,
            percentageOfTotal: 60,
          },
          {
            userId: GF,
            displayName: "GF",
            spent: 1_176_000,
            spentShared: 1_176_000,
            spentPersonal: 0,
            percentageOfTotal: 40,
          },
        ]}
      />,
    );

    expect(screen.getByText("Julián")).toBeInTheDocument();
    expect(screen.getByText("$ 1.764.000")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("says so when nobody has recorded anything", () => {
    render(
      <ContributionsCard
        colors={labels.memberColors}
        rows={[
          {
            userId: JULIAN,
            displayName: "Julián",
            spent: 0,
            spentShared: 0,
            spentPersonal: 0,
            percentageOfTotal: 0,
          },
        ]}
      />,
    );

    expect(screen.getByText(content.dashboard.contributionsEmpty)).toBeInTheDocument();
  });
});

describe("CreditCardsCard", () => {
  const card: CreditCard = {
    id: "card-1",
    userId: JULIAN,
    name: "TC1",
    creditLimit: 5_000_000,
    closingDay: 15,
    dueDay: 5,
    openingDebt: 0,
  };
  const reference = new Date(2026, 8, 11);

  it("shows debt, headroom and the two dates that matter", () => {
    const status = buildCreditCardStatus(
      card,
      [makeExpense({ payment_method_id: "card-1", amount: 1_000_000 })],
      [],
      reference,
    );

    render(<CreditCardsCard statuses={[status]} />);

    expect(screen.getByText("TC1")).toBeInTheDocument();
    expect(screen.getByText("$ 1.000.000")).toBeInTheDocument();
    expect(screen.getByText("$ 4.000.000")).toBeInTheDocument();
    expect(screen.getByText("15 sep")).toBeInTheDocument();
    expect(screen.getByText("5 oct")).toBeInTheDocument();
  });

  it("keeps each figure on one line and sizes its columns to the card (regression)", () => {
    // In a narrow dashboard column, four screen-keyed columns broke
    // "$ 14.800.000" into "$" and "14.800.000".
    const status = buildCreditCardStatus(card, [], [], reference);

    render(<CreditCardsCard statuses={[status]} />);

    const available = screen.getByText("$ 5.000.000").closest("dd");
    expect(available).toHaveClass("whitespace-nowrap");
    expect(available?.closest("dl")).toHaveClass("grid-cols-2", "@md:grid-cols-4");
  });

  it("warns when the limit is gone", () => {
    const status = buildCreditCardStatus(
      card,
      [makeExpense({ payment_method_id: "card-1", amount: 6_000_000 })],
      [],
      reference,
    );

    render(<CreditCardsCard statuses={[status]} />);

    expect(screen.getByText(content.creditCard.overLimit)).toBeInTheDocument();
  });

  it("says so when there are no cards", () => {
    render(<CreditCardsCard statuses={[]} />);

    expect(screen.getByText(content.dashboard.creditCardsEmpty)).toBeInTheDocument();
  });
});

describe("RecentExpenses", () => {
  const categoryColors = new Map([["rent", "var(--chart-1)"]]);

  const renderRecent = (expenses: ExpenseRow[]) =>
    render(<RecentExpenses expenses={expenses} labels={labels} categoryColors={categoryColors} />);

  it("gives each movement a row with who paid and how", () => {
    renderRecent([
      makeExpense({
        description: "Recibo del agua",
        amount: 80_000,
        category_id: "rent",
        user_id: JULIAN,
        payment_method_id: "bank",
        occurred_on: "2026-09-11",
      }),
    ]);

    expect(screen.getByText("Recibo del agua")).toBeInTheDocument();
    expect(screen.getByText("Arriendo")).toBeInTheDocument();
    expect(screen.getByText("Bancolombia")).toBeInTheDocument();
    expect(screen.getByText("Julián")).toBeInTheDocument();
    expect(screen.getByText("11 sep")).toBeInTheDocument();
  });

  it("heads every column, so the table can be read down as well as across", () => {
    renderRecent([makeExpense()]);

    for (const heading of [
      content.expenses.date,
      content.expenses.description,
      content.expenses.category,
      content.expenses.paymentMethod,
      content.expenses.paidBy,
      content.expenses.amount,
    ]) {
      expect(screen.getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }
  });

  it("marks a personal expense", () => {
    renderRecent([makeExpense({ shared: false })]);

    expect(screen.getByText(content.expenses.personal)).toBeInTheDocument();
  });

  it("shows at most a handful", () => {
    const many = Array.from({ length: 10 }, (_, index) =>
      makeExpense({ description: `Gasto ${index}` }),
    );

    renderRecent(many);

    expect(screen.getAllByRole("row")).toHaveLength(7);
  });

  it("says so when the month is empty", () => {
    renderRecent([]);

    expect(screen.getByText(content.dashboard.recentEmpty)).toBeInTheDocument();
  });
});
