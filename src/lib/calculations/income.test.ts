import { describe, expect, it } from "vitest";

import {
  GF,
  JULIAN,
  makeIncome,
  makeIncomeOverride,
  makeIncomeTemplateAmount,
  makeIncomeTemplateItem,
} from "@/test/factories";

import {
  buildIncomeByUser,
  incomeBaseline,
  receivedTemplateItemIds,
  resolveExpectedIncome,
  totalExpectedIncome,
} from "./income";

const payroll = makeIncomeTemplateItem({
  id: "payroll",
  user_id: JULIAN,
  label: "Nómina",
  amount: 4_000_000,
  payment_method_id: "bank",
});
const peoplePass = makeIncomeTemplateItem({
  id: "people-pass",
  user_id: JULIAN,
  label: "People Pass",
  amount: 500_000,
});
const freelance = makeIncomeTemplateItem({
  id: "freelance",
  user_id: GF,
  label: "Trabajo independiente",
  amount: 3_500_000,
});

describe("resolveExpectedIncome", () => {
  it("uses the template when the month says nothing, account included", () => {
    const rows = resolveExpectedIncome([payroll, freelance], [], [], "2026-09");

    expect(rows).toEqual([
      {
        templateItemId: "payroll",
        userId: JULIAN,
        label: "Nómina",
        paymentMethodId: "bank",
        amount: 4_000_000,
        isOverridden: false,
      },
      {
        templateItemId: "freelance",
        userId: GF,
        label: "Trabajo independiente",
        paymentMethodId: null,
        amount: 3_500_000,
        isOverridden: false,
      },
    ]);
  });

  it("does not expect a source before the month it starts", () => {
    // Created in September: August was already gone, and must not change.
    const newJob = makeIncomeTemplateItem({ id: "new-job", starts_on: "2026-09-01" });

    expect(resolveExpectedIncome([newJob], [], [], "2026-08")).toEqual([]);
    expect(resolveExpectedIncome([newJob], [], [], "2026-09")).toHaveLength(1);
    expect(resolveExpectedIncome([newJob], [], [], "2027-03")).toHaveLength(1);
  });

  it("applies an amount change only from the month it takes effect", () => {
    // Listed newest first, so the latest change has to win on its date, not its position.
    const changes = [
      makeIncomeTemplateAmount({
        template_item_id: "payroll",
        effective_from: "2026-12-01",
        amount: 6_000_000,
      }),
      makeIncomeTemplateAmount({
        template_item_id: "payroll",
        effective_from: "2026-10-01",
        amount: 5_000_000,
      }),
    ];

    const amountIn = (month: string) =>
      resolveExpectedIncome([payroll], changes, [], month).at(0)?.amount;

    expect(amountIn("2026-09")).toBe(4_000_000);
    expect(amountIn("2026-10")).toBe(5_000_000);
    expect(amountIn("2026-11")).toBe(5_000_000);
    expect(amountIn("2027-01")).toBe(6_000_000);
  });

  it("lets a month override win over an amount change", () => {
    const changes = [
      makeIncomeTemplateAmount({ template_item_id: "payroll", effective_from: "2026-09-01" }),
    ];
    const overrides = [
      makeIncomeOverride({ month: "2026-09-01", template_item_id: "payroll", amount: 1_000 }),
    ];

    expect(resolveExpectedIncome([payroll], changes, overrides, "2026-09").at(0)).toMatchObject({
      amount: 1_000,
      isOverridden: true,
    });
  });

  it("lets a month override one source without touching the template", () => {
    const overrides = [
      makeIncomeOverride({ month: "2026-09-01", template_item_id: "freelance", amount: 2_900_000 }),
    ];

    const september = resolveExpectedIncome([payroll, freelance], [], overrides, "2026-09");
    const october = resolveExpectedIncome([payroll, freelance], [], overrides, "2026-10");

    expect(september.find((row) => row.templateItemId === "freelance")).toMatchObject({
      amount: 2_900_000,
      isOverridden: true,
    });
    expect(october.find((row) => row.templateItemId === "freelance")?.amount).toBe(3_500_000);
    expect(freelance.amount).toBe(3_500_000);
  });

  it("honours an override of zero rather than falling back to the template", () => {
    const overrides = [
      makeIncomeOverride({ month: "2026-09-01", template_item_id: "freelance", amount: 0 }),
    ];

    expect(resolveExpectedIncome([freelance], [], overrides, "2026-09").at(0)).toMatchObject({
      amount: 0,
      isOverridden: true,
    });
  });

  it("ignores overrides from another month", () => {
    const overrides = [
      makeIncomeOverride({ month: "2026-08-01", template_item_id: "payroll", amount: 1 }),
    ];

    expect(resolveExpectedIncome([payroll], [], overrides, "2026-09")[0]?.amount).toBe(4_000_000);
  });

  it("leaves out retired income sources", () => {
    const retired = makeIncomeTemplateItem({ id: "old-job", active: false });

    expect(resolveExpectedIncome([payroll, retired], [], [], "2026-09")).toHaveLength(1);
  });

  it("expects nothing when the template is empty", () => {
    expect(resolveExpectedIncome([], [], [], "2026-09")).toEqual([]);
  });
});

describe("incomeBaseline", () => {
  const changes = [
    makeIncomeTemplateAmount({
      template_item_id: "payroll",
      effective_from: "2026-10-01",
      amount: 5_000_000,
    }),
  ];

  it("is the amount a source started with until it changes", () => {
    expect(incomeBaseline(payroll, changes, "2026-09")).toBe(4_000_000);
  });

  it("is the latest change once one has taken effect", () => {
    expect(incomeBaseline(payroll, changes, "2026-10")).toBe(5_000_000);
  });

  it("ignores changes to other sources", () => {
    expect(incomeBaseline(freelance, changes, "2026-10")).toBe(3_500_000);
  });
});

describe("receivedTemplateItemIds", () => {
  it("names the sources recorded as received in the month", () => {
    const incomes = [
      makeIncome({ template_item_id: "payroll", occurred_on: "2026-09-30" }),
      makeIncome({ template_item_id: "freelance", occurred_on: "2026-08-31" }),
      makeIncome({ template_item_id: null, occurred_on: "2026-09-05" }),
    ];

    expect(receivedTemplateItemIds(incomes, "2026-09")).toEqual(new Set(["payroll"]));
  });

  it("is empty when nothing came from the plan", () => {
    expect(receivedTemplateItemIds([makeIncome()], "2026-09").size).toBe(0);
  });
});

describe("totalExpectedIncome", () => {
  it("adds every expected source", () => {
    const rows = resolveExpectedIncome([payroll, peoplePass, freelance], [], [], "2026-09");

    expect(totalExpectedIncome(rows)).toBe(8_000_000);
  });

  it("expects zero from an empty month", () => {
    expect(totalExpectedIncome([])).toBe(0);
  });
});

describe("buildIncomeByUser", () => {
  const julian = { userId: JULIAN, displayName: "Julián" };
  const gf = { userId: GF, displayName: "GF" };
  const members = [julian, gf];

  it("compares expected against actual per person", () => {
    const expected = resolveExpectedIncome([payroll, peoplePass, freelance], [], [], "2026-09");
    const actual = new Map([
      [JULIAN, 4_500_000],
      [GF, 2_900_000],
    ]);

    expect(buildIncomeByUser(members, expected, actual)).toEqual([
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

  it("reports a shortfall as a negative difference", () => {
    const expected = resolveExpectedIncome([freelance], [], [], "2026-09");

    expect(buildIncomeByUser([gf], expected, new Map()).at(0)).toMatchObject({
      expected: 3_500_000,
      actual: 0,
      difference: -3_500_000,
    });
  });

  it("reports a windfall as a positive difference", () => {
    expect(buildIncomeByUser([gf], [], new Map([[GF, 900_000]])).at(0)).toMatchObject({
      expected: 0,
      actual: 900_000,
      difference: 900_000,
    });
  });

  it("returns nothing when the household has no members", () => {
    expect(buildIncomeByUser([], [], new Map())).toEqual([]);
  });
});
