import { describe, expect, it } from "vitest";

import {
  GF,
  JULIAN,
  makeBudgetOverride,
  makeBudgetTemplateItem,
  makeCategory,
  makeCouple,
  makeCreditCard,
  makeExpense,
  makeIncome,
  makeIncomeTemplateItem,
  makePaymentMethod,
  makeTransfer,
} from "@/test/factories";

import { buildMonthSummary, type MonthSummaryInput } from "./dashboard";

const REFERENCE = new Date(2026, 8, 11);

const julianBank = makePaymentMethod({ id: "julian-bank", user_id: JULIAN });
const julianCard = makeCreditCard({
  id: "julian-card",
  user_id: JULIAN,
  credit_limit: 5_000_000,
  closing_day: 15,
  due_day: 5,
});
const gfBank = makePaymentMethod({ id: "gf-bank", user_id: GF });

const categories = [
  makeCategory({ id: "rent", name: "Arriendo", sort_order: 10 }),
  makeCategory({ id: "utilities", name: "Servicios", sort_order: 20 }),
  makeCategory({ id: "groceries", name: "Mercado", sort_order: 30 }),
  makeCategory({ id: "transport", name: "Transporte", sort_order: 40 }),
];

/** September: rent 1.5M, utilities 270k, groceries 920k, transport 250k. */
const septemberExpenses = [
  makeExpense({
    user_id: JULIAN,
    payment_method_id: julianBank.id,
    category_id: "rent",
    amount: 1_500_000,
    occurred_on: "2026-09-01",
  }),
  makeExpense({
    user_id: JULIAN,
    payment_method_id: julianCard.id,
    category_id: "utilities",
    amount: 270_000,
    occurred_on: "2026-09-05",
  }),
  makeExpense({
    user_id: GF,
    payment_method_id: gfBank.id,
    category_id: "groceries",
    amount: 920_000,
    occurred_on: "2026-09-10",
  }),
  makeExpense({
    user_id: GF,
    payment_method_id: gfBank.id,
    category_id: "transport",
    amount: 250_000,
    occurred_on: "2026-09-12",
  }),
];

/** One charge from the previous month, to prove balances carry over. */
const augustCardExpense = makeExpense({
  user_id: JULIAN,
  payment_method_id: julianCard.id,
  category_id: "utilities",
  amount: 100_000,
  occurred_on: "2026-08-20",
});

function buildInput(overrides: Partial<MonthSummaryInput> = {}): MonthSummaryInput {
  return {
    month: "2026-09",
    reference: REFERENCE,
    members: makeCouple(),
    categories,
    paymentMethods: [julianBank, julianCard, gfBank],
    expenses: [...septemberExpenses, augustCardExpense],
    incomes: [
      makeIncome({ user_id: JULIAN, amount: 4_500_000, occurred_on: "2026-09-01" }),
      makeIncome({ user_id: GF, amount: 2_900_000, occurred_on: "2026-09-15" }),
    ],
    transfers: [],
    budgetTemplate: [
      makeBudgetTemplateItem({ category_id: "rent", amount: 1_500_000 }),
      makeBudgetTemplateItem({ category_id: "utilities", amount: 300_000 }),
      makeBudgetTemplateItem({ category_id: "groceries", amount: 800_000 }),
      makeBudgetTemplateItem({ category_id: "transport", amount: 300_000 }),
    ],
    budgetOverrides: [],
    incomeTemplate: [
      makeIncomeTemplateItem({ id: "payroll", user_id: JULIAN, amount: 4_500_000 }),
      makeIncomeTemplateItem({
        id: "freelance",
        user_id: GF,
        label: "Independiente",
        amount: 3_500_000,
      }),
    ],
    incomeTemplateAmounts: [],
    incomeOverrides: [],
    ...overrides,
  };
}

describe("buildMonthSummary", () => {
  it("compares planned against actual for the headline figures", () => {
    const summary = buildMonthSummary(buildInput());

    expect(summary.income).toEqual({
      planned: 8_000_000,
      actual: 7_400_000,
      difference: -600_000,
    });
    expect(summary.expenses).toEqual({
      planned: 2_900_000,
      actual: 2_940_000,
      difference: 40_000,
    });
    expect(summary.remaining).toEqual({
      planned: 5_100_000,
      actual: 4_460_000,
      difference: -640_000,
    });
  });

  it("plans a category from its repeating expenses on top of what was typed", () => {
    const netflix = makeExpense({
      user_id: JULIAN,
      payment_method_id: julianCard.id,
      category_id: "utilities",
      amount: 45_000,
      occurred_on: "2026-08-05",
      repeat_months: 1,
    });

    const summary = buildMonthSummary(buildInput({ expenses: [netflix] }));
    const utilities = summary.categoryPlan.find((row) => row.categoryId === "utilities");

    // 300.000 typed into the template, plus the subscription that repeats.
    expect(utilities).toMatchObject({ planned: 345_000, actual: 45_000 });
    expect(summary.expenses.planned).toBe(2_945_000);
  });

  it("breaks the month down by category and flags overspending", () => {
    const summary = buildMonthSummary(buildInput());

    expect(
      summary.categoryPlan.map((row) => [
        row.categoryName,
        row.planned,
        row.actual,
        row.isOverBudget,
      ]),
    ).toEqual([
      ["Arriendo", 1_500_000, 1_500_000, false],
      ["Servicios", 300_000, 270_000, false],
      ["Mercado", 800_000, 920_000, true],
      ["Transporte", 300_000, 250_000, false],
    ]);
  });

  it("applies a month override without disturbing the other months", () => {
    const summary = buildMonthSummary(
      buildInput({
        budgetOverrides: [
          makeBudgetOverride({ month: "2026-09-01", category_id: "groceries", amount: 950_000 }),
        ],
      }),
    );

    const groceries = summary.categoryPlan.find((row) => row.categoryId === "groceries");

    expect(groceries).toMatchObject({ planned: 950_000, isOverBudget: false, isOverridden: true });
    expect(summary.expenses.planned).toBe(3_050_000);
  });

  it("compares expected against actual income per person", () => {
    const summary = buildMonthSummary(buildInput());

    expect(summary.incomeByUser).toEqual([
      {
        userId: JULIAN,
        displayName: "Julián",
        expected: 4_500_000,
        actual: 4_500_000,
        difference: 0,
      },
      {
        userId: GF,
        displayName: "GF",
        expected: 3_500_000,
        actual: 2_900_000,
        difference: -600_000,
      },
    ]);
  });

  it("gives each person their part of the month, not what went through their card", () => {
    const summary = buildMonthSummary(buildInput());

    // Julián paid 1.77M and GF 1.17M, all shared half and half: 1.47M each.
    expect(summary.contributions).toEqual([
      {
        userId: JULIAN,
        displayName: "Julián",
        spent: 1_470_000,
        spentShared: 1_470_000,
        spentPersonal: 0,
        percentageOfTotal: 50,
      },
      {
        userId: GF,
        displayName: "GF",
        spent: 1_470_000,
        spentShared: 1_470_000,
        spentPersonal: 0,
        percentageOfTotal: 50,
      },
    ]);
  });

  it("splits a shared expense by its own percentage", () => {
    const rent = makeExpense({
      user_id: JULIAN,
      payment_method_id: julianBank.id,
      category_id: "rent",
      amount: 1_000_000,
      occurred_on: "2026-09-01",
      payer_share_percent: 70,
    });

    const summary = buildMonthSummary(buildInput({ expenses: [rent] }));

    expect(summary.contributions.map((row) => row.spent)).toEqual([700_000, 300_000]);
    expect(summary.people.map((person) => person.spent)).toEqual([700_000, 300_000]);
  });

  it("puts a personal expense entirely on whoever paid", () => {
    const shoes = makeExpense({
      user_id: GF,
      payment_method_id: gfBank.id,
      category_id: "groceries",
      amount: 150_000,
      occurred_on: "2026-09-18",
      shared: false,
    });

    const summary = buildMonthSummary(buildInput({ expenses: [shoes] }));

    expect(summary.contributions).toMatchObject([
      { userId: JULIAN, spent: 0, spentPersonal: 0 },
      { userId: GF, spent: 150_000, spentPersonal: 150_000 },
    ]);
  });

  it("reads each person's month against their own income", () => {
    const summary = buildMonthSummary(buildInput());

    expect(summary.people.at(0)).toMatchObject({
      userId: JULIAN,
      income: 4_500_000,
      spent: 1_470_000,
      available: 3_030_000,
    });
  });

  it("carries credit-card debt across month boundaries", () => {
    const summary = buildMonthSummary(buildInput());
    const [card] = summary.creditCards;

    // 100k charged in August plus 270k in September; debt does not reset.
    expect(card?.used).toBe(370_000);
    expect(card?.available).toBe(4_630_000);
    expect(card?.currentCycleTotal).toBe(370_000);
  });

  it("adds every charge of a repeating card purchase to the card's debt (regression)", () => {
    // Counted once, a monthly subscription stopped adding to the debt after its
    // first month.
    const subscription = makeExpense({
      user_id: JULIAN,
      payment_method_id: julianCard.id,
      category_id: "utilities",
      amount: 95_000,
      occurred_on: "2026-09-13",
      repeat_months: 1,
    });

    const summary = buildMonthSummary(buildInput({ month: "2026-11", expenses: [subscription] }));

    // Charged on 13 sep, 13 oct and 13 nov.
    expect(summary.creditCards.at(0)?.used).toBe(285_000);
  });

  it("does not count a credit-card payment as spending", () => {
    const withPayment = buildMonthSummary(
      buildInput({
        transfers: [
          makeTransfer({
            from_payment_method_id: julianBank.id,
            to_payment_method_id: julianCard.id,
            amount: 370_000,
            occurred_on: "2026-09-20",
          }),
        ],
      }),
    );

    expect(withPayment.expenses.actual).toBe(2_940_000);
    expect(withPayment.creditCards.at(0)?.used).toBe(0);
  });

  it("counts only the month itself in each person's part, not earlier months", () => {
    const summary = buildMonthSummary(buildInput());

    // August's 100k card charge is card debt, not September spending.
    const total = summary.contributions.reduce((sum, row) => sum + row.spent, 0);
    expect(total).toBe(2_940_000);
  });

  it("ignores transactions from months after the one being viewed", () => {
    const summary = buildMonthSummary(
      buildInput({
        expenses: [
          ...septemberExpenses,
          makeExpense({
            user_id: JULIAN,
            payment_method_id: julianCard.id,
            category_id: "rent",
            amount: 9_000_000,
            occurred_on: "2026-10-01",
          }),
        ],
      }),
    );

    expect(summary.expenses.actual).toBe(2_940_000);
    expect(summary.creditCards.at(0)?.used).toBe(270_000);
  });

  it("handles a month with nothing recorded at all", () => {
    const summary = buildMonthSummary(
      buildInput({
        month: "2026-01",
        expenses: [],
        incomes: [],
        budgetTemplate: [],
        incomeTemplate: [],
      }),
    );

    expect(summary.income).toEqual({ planned: 0, actual: 0, difference: 0 });
    expect(summary.expenses).toEqual({ planned: 0, actual: 0, difference: 0 });
    expect(summary.remaining).toEqual({ planned: 0, actual: 0, difference: 0 });
    expect(summary.contributions.every((row) => row.percentageOfTotal === 0)).toBe(true);
  });

  describe("switched-off expenses", () => {
    it("leaves them out of the month's totals", () => {
      const summary = buildMonthSummary(
        buildInput({
          expenses: [
            ...septemberExpenses,
            makeExpense({
              user_id: JULIAN,
              payment_method_id: julianBank.id,
              category_id: "groceries",
              amount: 5_000_000,
              occurred_on: "2026-09-14",
              active: false,
            }),
          ],
        }),
      );

      expect(summary.expenses.actual).toBe(2_940_000);
      expect(summary.categoryPlan.find((row) => row.categoryId === "groceries")?.actual).toBe(
        920_000,
      );
    });

    it("leaves them out of credit-card debt", () => {
      const summary = buildMonthSummary(
        buildInput({
          expenses: [
            makeExpense({
              payment_method_id: julianCard.id,
              category_id: "utilities",
              amount: 400_000,
              occurred_on: "2026-09-05",
              active: false,
            }),
          ],
        }),
      );

      expect(summary.creditCards.at(0)?.used).toBe(0);
    });

    it("leaves them out of each person's part", () => {
      const summary = buildMonthSummary(
        buildInput({
          expenses: [
            makeExpense({
              user_id: JULIAN,
              payment_method_id: julianBank.id,
              category_id: "rent",
              amount: 1_000_000,
              occurred_on: "2026-09-01",
              active: false,
            }),
          ],
        }),
      );

      expect(summary.contributions.every((row) => row.spent === 0)).toBe(true);
    });

    it("can be switched back on to restore the totals", () => {
      const excluded = makeExpense({
        user_id: JULIAN,
        payment_method_id: julianBank.id,
        category_id: "rent",
        amount: 100_000,
        occurred_on: "2026-09-02",
        active: false,
      });

      const withoutIt = buildMonthSummary(buildInput({ expenses: [excluded] }));
      const withIt = buildMonthSummary(buildInput({ expenses: [{ ...excluded, active: true }] }));

      expect(withoutIt.expenses.actual).toBe(0);
      expect(withIt.expenses.actual).toBe(100_000);
    });
  });

  describe("household and personal breakdown", () => {
    it("splits the month into shared and personal spending", () => {
      const summary = buildMonthSummary(
        buildInput({
          expenses: [
            ...septemberExpenses,
            makeExpense({
              user_id: GF,
              payment_method_id: gfBank.id,
              category_id: "groceries",
              amount: 150_000,
              occurred_on: "2026-09-18",
              shared: false,
            }),
          ],
        }),
      );

      expect(summary.breakdown.household).toBe(2_940_000);
      expect(summary.breakdown.personalTotal).toBe(150_000);
      expect(summary.breakdown.personal.find((row) => row.userId === GF)?.amount).toBe(150_000);
    });

    it("ignores a switched-off personal expense", () => {
      const summary = buildMonthSummary(
        buildInput({
          expenses: [
            makeExpense({
              user_id: GF,
              payment_method_id: gfBank.id,
              category_id: "groceries",
              amount: 150_000,
              occurred_on: "2026-09-18",
              shared: false,
              active: false,
            }),
          ],
        }),
      );

      expect(summary.breakdown.personalTotal).toBe(0);
    });
  });

  describe("expenses that reach beyond their own month", () => {
    it("splits a bill that covers two months across both", () => {
      const water = makeExpense({
        user_id: JULIAN,
        payment_method_id: julianBank.id,
        category_id: "utilities",
        amount: 160_000,
        occurred_on: "2026-09-11",
        installments: 2,
      });

      const september = buildMonthSummary(buildInput({ expenses: [water] }));
      const october = buildMonthSummary(buildInput({ month: "2026-10", expenses: [water] }));

      expect(september.expenses.actual).toBe(80_000);
      expect(october.expenses.actual).toBe(80_000);
    });

    it("repeats a fixed bill month after month without retyping it", () => {
      const rent = makeExpense({
        user_id: JULIAN,
        payment_method_id: julianBank.id,
        category_id: "rent",
        amount: 1_500_000,
        occurred_on: "2026-09-01",
        repeat_months: 1,
      });

      for (const month of ["2026-09", "2026-10", "2027-02"]) {
        const summary = buildMonthSummary(buildInput({ month, expenses: [rent] }));
        expect(summary.expenses.actual).toBe(1_500_000);
      }
    });

    it("gives a bimonthly bill steady monthly coverage", () => {
      const water = makeExpense({
        user_id: JULIAN,
        payment_method_id: julianBank.id,
        category_id: "utilities",
        amount: 160_000,
        occurred_on: "2026-09-11",
        installments: 2,
        repeat_months: 2,
      });

      for (const month of ["2026-09", "2026-10", "2026-11", "2026-12"]) {
        expect(buildMonthSummary(buildInput({ month, expenses: [water] })).expenses.actual).toBe(
          80_000,
        );
      }
    });

    it("charges a card purchase as cuotas, but owes the bank the whole price", () => {
      const tv = makeExpense({
        user_id: JULIAN,
        payment_method_id: julianCard.id,
        category_id: "rent",
        amount: 1_200_000,
        occurred_on: "2026-09-20",
        installments: 12,
        annual_rate_percent: 28.5,
      });

      const summary = buildMonthSummary(buildInput({ expenses: [tv] }));

      // The month is charged one cuota...
      expect(summary.expenses.actual).toBeGreaterThan(100_000);
      expect(summary.expenses.actual).toBeLessThan(200_000);
      // ...while the card still carries the full principal.
      expect(summary.creditCards.at(0)?.used).toBe(1_200_000);
    });

    it("splits the cuota charged this month, not the whole purchase", () => {
      const tv = makeExpense({
        user_id: JULIAN,
        payment_method_id: julianCard.id,
        category_id: "rent",
        amount: 1_200_000,
        occurred_on: "2026-09-20",
        installments: 12,
        annual_rate_percent: 28.5,
        shared: true,
      });

      const gf = buildMonthSummary(buildInput({ expenses: [tv] })).contributions.at(1);

      // GF carries half of the first cuota, not half of 1,2M.
      expect(gf?.spent).toBeGreaterThan(0);
      expect(gf?.spent).toBeLessThan(100_000);
    });

    it("counts a spread bill under its category in every month it covers", () => {
      const water = makeExpense({
        user_id: JULIAN,
        payment_method_id: julianBank.id,
        category_id: "utilities",
        amount: 160_000,
        occurred_on: "2026-09-11",
        installments: 2,
      });

      const october = buildMonthSummary(buildInput({ month: "2026-10", expenses: [water] }));

      expect(october.categoryPlan.find((row) => row.categoryId === "utilities")?.actual).toBe(
        80_000,
      );
    });

    it("still ignores a spread expense that has been switched off", () => {
      const water = makeExpense({
        payment_method_id: julianBank.id,
        category_id: "utilities",
        amount: 160_000,
        occurred_on: "2026-09-11",
        installments: 2,
        active: false,
      });

      expect(buildMonthSummary(buildInput({ expenses: [water] })).expenses.actual).toBe(0);
    });
  });

  it("reports the month it was asked about", () => {
    expect(buildMonthSummary(buildInput({ month: "2026-10" })).month).toBe("2026-10");
  });
});
