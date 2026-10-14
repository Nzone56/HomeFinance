import { describe, expect, it } from "vitest";

import { content } from "@/content/es";
import { NO_SELECTION } from "@/lib/ui/select-option";

import {
  expenseActiveSchema,
  expenseInputSchema,
  incomeInputSchema,
  transferInputSchema,
} from "./transactions";

const CATEGORY = "11111111-1111-4111-8111-111111111111";
const METHOD = "22222222-2222-4222-8222-222222222222";
const OTHER_METHOD = "33333333-3333-4333-8333-333333333333";
const USER = "44444444-4444-4444-8444-444444444444";

const validExpense = {
  description: "Recibo del agua",
  amount: "80.000",
  occurred_on: "2026-09-11",
  category_id: CATEGORY,
  payment_method_id: METHOD,
  user_id: USER,
  shared: "on",
  notes: "",
};

describe("expenseInputSchema", () => {
  it("parses a filled-in form into database-ready values", () => {
    const result = expenseInputSchema.safeParse(validExpense);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      description: "Recibo del agua",
      amount: 80_000,
      occurred_on: "2026-09-11",
      category_id: CATEGORY,
      payment_method_id: METHOD,
      user_id: USER,
      shared: true,
      payer_share_percent: 50,
      notes: null,
      installments: 1,
      annual_rate_percent: null,
      repeat_months: null,
      repeat_until: null,
    });
  });

  it("keeps the payer's part of a shared expense", () => {
    const result = expenseInputSchema.safeParse({ ...validExpense, payer_share_percent: "70" });

    expect(result.data?.payer_share_percent).toBe(70);
  });

  it("refuses a split beyond 100%", () => {
    const result = expenseInputSchema.safeParse({ ...validExpense, payer_share_percent: "120" });

    expect(result.error?.issues.at(0)).toMatchObject({
      path: ["payer_share_percent"],
      message: content.validation.splitRange,
    });
  });

  it("treats an absent toggle as a personal expense", () => {
    const { shared: _shared, ...withoutToggle } = validExpense;
    const result = expenseInputSchema.safeParse(withoutToggle);

    expect(result.data?.shared).toBe(false);
  });

  it("keeps notes that were actually typed", () => {
    const result = expenseInputSchema.safeParse({ ...validExpense, notes: " se pagó tarde " });

    expect(result.data?.notes).toBe("se pagó tarde");
  });

  it("requires a description", () => {
    const result = expenseInputSchema.safeParse({ ...validExpense, description: "" });

    expect(result.success).toBe(false);
  });

  it("rejects an amount of zero", () => {
    const result = expenseInputSchema.safeParse({ ...validExpense, amount: "0" });

    expect(result.error?.issues.at(0)?.message).toBe(content.validation.amountPositive);
  });

  it("rejects an impossible date", () => {
    const result = expenseInputSchema.safeParse({ ...validExpense, occurred_on: "2026-02-30" });

    expect(result.success).toBe(false);
  });

  it("refuses a rate on a purchase that is not in cuotas", () => {
    const result = expenseInputSchema.safeParse({
      ...validExpense,
      installments: "1",
      annual_rate_percent: "28.5",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.at(0)?.message).toBe(content.validation.rateNeedsInstallments);
  });

  it("allows a rate once the purchase is in cuotas", () => {
    const result = expenseInputSchema.safeParse({
      ...validExpense,
      installments: "12",
      annual_rate_percent: "28,5",
    });

    expect(result.data?.annual_rate_percent).toBe(28.5);
    expect(result.data?.installments).toBe(12);
  });

  it("refuses an end date with nothing to repeat", () => {
    const result = expenseInputSchema.safeParse({
      ...validExpense,
      repeat_until: "2026-12-31",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.at(0)?.message).toBe(content.validation.repeatUntilNeedsRepeat);
  });

  it("allows an end date once the expense repeats", () => {
    const result = expenseInputSchema.safeParse({
      ...validExpense,
      repeat_months: "2",
      repeat_until: "2026-12-31",
    });

    expect(result.data).toMatchObject({ repeat_months: 2, repeat_until: "2026-12-31" });
  });

  it("rejects a category that is not a real reference", () => {
    const result = expenseInputSchema.safeParse({ ...validExpense, category_id: "groceries" });

    expect(result.success).toBe(false);
  });
});

describe("incomeInputSchema", () => {
  const validIncome = {
    label: "Nómina de septiembre",
    amount: "4.500.000",
    occurred_on: "2026-09-01",
    user_id: USER,
    payment_method_id: METHOD,
    notes: "",
  };

  it("parses a filled-in form", () => {
    const result = incomeInputSchema.safeParse(validIncome);

    expect(result.data).toEqual({
      label: "Nómina de septiembre",
      amount: 4_500_000,
      occurred_on: "2026-09-01",
      user_id: USER,
      payment_method_id: METHOD,
      notes: null,
    });
  });

  it("allows income with no account behind it", () => {
    const result = incomeInputSchema.safeParse({
      ...validIncome,
      payment_method_id: NO_SELECTION,
    });

    expect(result.data?.payment_method_id).toBeNull();
  });

  it("requires a concept", () => {
    expect(incomeInputSchema.safeParse({ ...validIncome, label: "" }).success).toBe(false);
  });
});

describe("transferInputSchema", () => {
  const validTransfer = {
    from_payment_method_id: METHOD,
    to_payment_method_id: OTHER_METHOD,
    amount: "370.000",
    occurred_on: "2026-09-20",
    user_id: USER,
    notes: "",
  };

  it("parses a transfer between two accounts", () => {
    const result = transferInputSchema.safeParse(validTransfer);

    expect(result.success).toBe(true);
    expect(result.data?.amount).toBe(370_000);
  });

  it("refuses to move money from an account to itself", () => {
    const result = transferInputSchema.safeParse({
      ...validTransfer,
      to_payment_method_id: METHOD,
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues.at(0)?.message).toBe(content.validation.sameAccount);
    expect(result.error?.issues.at(0)?.path).toEqual(["to_payment_method_id"]);
  });

  it("requires both accounts", () => {
    expect(
      transferInputSchema.safeParse({ ...validTransfer, from_payment_method_id: "" }).success,
    ).toBe(false);
  });
});

describe("expenseActiveSchema", () => {
  const ROW = "66666666-6666-4666-8666-666666666666";

  it("reads the requested state explicitly", () => {
    expect(expenseActiveSchema.safeParse({ id: ROW, active: "true" }).data).toEqual({
      id: ROW,
      active: true,
    });
    expect(expenseActiveSchema.safeParse({ id: ROW, active: "false" }).data).toEqual({
      id: ROW,
      active: false,
    });
  });

  it("refuses anything but an explicit state", () => {
    // A missing value must not be read as 'switch it off'.
    expect(expenseActiveSchema.safeParse({ id: ROW }).success).toBe(false);
    expect(expenseActiveSchema.safeParse({ id: ROW, active: "on" }).success).toBe(false);
  });

  it("refuses a malformed row id", () => {
    expect(expenseActiveSchema.safeParse({ id: "nope", active: "true" }).success).toBe(false);
  });
});
