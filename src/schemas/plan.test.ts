import { describe, expect, it } from "vitest";

import {
  budgetMonthOverrideSchema,
  budgetOverrideResetSchema,
  budgetTemplateItemSchema,
  incomeMonthOverrideSchema,
  incomeOverrideResetSchema,
  incomeReceiptSchema,
  incomeTemplateAmountSchema,
  incomeTemplateItemSchema,
} from "./plan";

const CATEGORY = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";
const USER = "44444444-4444-4444-8444-444444444444";

describe("budgetTemplateItemSchema", () => {
  it("parses a template line", () => {
    expect(
      budgetTemplateItemSchema.safeParse({ category_id: CATEGORY, amount: "1.500.000" }).data,
    ).toEqual({ category_id: CATEGORY, amount: 1_500_000 });
  });

  it("allows zero, so a category can be planned at nothing", () => {
    expect(budgetTemplateItemSchema.safeParse({ category_id: CATEGORY, amount: "0" }).data).toEqual(
      { category_id: CATEGORY, amount: 0 },
    );
  });

  it("rejects a missing category", () => {
    expect(budgetTemplateItemSchema.safeParse({ amount: "100" }).success).toBe(false);
  });
});

describe("budgetMonthOverrideSchema", () => {
  it("parses a month override", () => {
    expect(
      budgetMonthOverrideSchema.safeParse({
        month: "2026-09",
        category_id: CATEGORY,
        amount: "950.000",
      }).data,
    ).toEqual({ month: "2026-09", category_id: CATEGORY, amount: 950_000 });
  });

  it("rejects a month that is not a month key", () => {
    expect(
      budgetMonthOverrideSchema.safeParse({
        month: "2026-09-01",
        category_id: CATEGORY,
        amount: "1",
      }).success,
    ).toBe(false);
  });
});

describe("budgetOverrideResetSchema", () => {
  it("needs only the month and the category", () => {
    expect(
      budgetOverrideResetSchema.safeParse({ month: "2026-09", category_id: CATEGORY }).data,
    ).toEqual({ month: "2026-09", category_id: CATEGORY });
  });
});

describe("incomeTemplateItemSchema", () => {
  it("parses an income source", () => {
    expect(
      incomeTemplateItemSchema.safeParse({
        user_id: USER,
        label: "Nómina",
        amount: "4.500.000",
        active: "on",
      }).data,
    ).toEqual({
      user_id: USER,
      label: "Nómina",
      amount: 4_500_000,
      active: true,
      payment_method_id: null,
    });
  });

  it("keeps the account the income lands in", () => {
    expect(
      incomeTemplateItemSchema.safeParse({
        user_id: USER,
        label: "Nómina",
        amount: "1",
        payment_method_id: ITEM,
      }).data?.payment_method_id,
    ).toBe(ITEM);
  });

  it("treats an absent toggle as retired", () => {
    expect(
      incomeTemplateItemSchema.safeParse({ user_id: USER, label: "Viejo", amount: "0" }).data
        ?.active,
    ).toBe(false);
  });

  it("requires a concept", () => {
    expect(
      incomeTemplateItemSchema.safeParse({ user_id: USER, label: "", amount: "1" }).success,
    ).toBe(false);
  });
});

describe("incomeTemplateAmountSchema", () => {
  it("parses just the baseline amount", () => {
    expect(
      incomeTemplateAmountSchema.safeParse({ template_item_id: ITEM, amount: "3.500.000" }).data,
    ).toEqual({ template_item_id: ITEM, amount: 3_500_000 });
  });
});

describe("incomeMonthOverrideSchema", () => {
  it("parses a month override", () => {
    expect(
      incomeMonthOverrideSchema.safeParse({
        month: "2026-09",
        template_item_id: ITEM,
        amount: "2.900.000",
      }).data,
    ).toEqual({ month: "2026-09", template_item_id: ITEM, amount: 2_900_000 });
  });
});

describe("incomeReceiptSchema", () => {
  it("needs only the source and the month it was expected in", () => {
    expect(
      incomeReceiptSchema.safeParse({ month: "2026-09", template_item_id: ITEM }).data,
    ).toEqual({ month: "2026-09", template_item_id: ITEM });
  });

  it("refuses a request that names no real month", () => {
    expect(incomeReceiptSchema.safeParse({ month: "2026-9", template_item_id: ITEM }).success).toBe(
      false,
    );
  });
});

describe("incomeOverrideResetSchema", () => {
  it("needs only the month and the source", () => {
    expect(
      incomeOverrideResetSchema.safeParse({ month: "2026-09", template_item_id: ITEM }).data,
    ).toEqual({ month: "2026-09", template_item_id: ITEM });
  });
});
