import { describe, expect, it } from "vitest";

import { content } from "@/content/es";

import {
  categoryInputSchema,
  householdInputSchema,
  paymentMethodInputSchema,
  profileInputSchema,
} from "./settings";

const USER = "44444444-4444-4444-8444-444444444444";

const bankAccount = {
  name: "Cuenta de nómina",
  type: "bank_account",
  user_id: USER,
  active: "on",
  credit_limit: "",
  closing_day: "",
  due_day: "",
};

const creditCard = {
  name: "Tarjeta de crédito 1",
  type: "credit_card",
  user_id: USER,
  active: "on",
  credit_limit: "5.000.000",
  closing_day: "15",
  due_day: "5",
};

describe("paymentMethodInputSchema", () => {
  it("parses a plain bank account", () => {
    const result = paymentMethodInputSchema.safeParse(bankAccount);

    expect(result.data).toEqual({
      name: "Cuenta de nómina",
      type: "bank_account",
      user_id: USER,
      active: true,
      credit_limit: null,
      closing_day: null,
      due_day: null,
      default_annual_rate_percent: null,
      opening_debt: 0,
    });
  });

  it("reads a card's starting debt, and treats a blank one as none", () => {
    expect(
      paymentMethodInputSchema.safeParse({ ...creditCard, opening_debt: "808.307" }).data
        ?.opening_debt,
    ).toBe(808_307);
    expect(paymentMethodInputSchema.safeParse(creditCard).data?.opening_debt).toBe(0);
  });

  it("never gives anything but a credit card a starting debt", () => {
    expect(
      paymentMethodInputSchema.safeParse({ ...bankAccount, opening_debt: "500.000" }).data
        ?.opening_debt,
    ).toBe(0);
  });

  it("parses a credit card with its cycle", () => {
    const result = paymentMethodInputSchema.safeParse(creditCard);

    expect(result.data).toMatchObject({
      type: "credit_card",
      credit_limit: 5_000_000,
      closing_day: 15,
      due_day: 5,
    });
  });

  it("demands the cycle fields for a credit card", () => {
    const result = paymentMethodInputSchema.safeParse({ ...creditCard, credit_limit: "" });

    expect(result.success).toBe(false);
    expect(result.error?.issues.at(0)?.message).toBe(content.validation.creditCardFieldsRequired);
  });

  it("demands a closing day for a credit card", () => {
    expect(paymentMethodInputSchema.safeParse({ ...creditCard, closing_day: "" }).success).toBe(
      false,
    );
  });

  it("demands a due day for a credit card", () => {
    expect(paymentMethodInputSchema.safeParse({ ...creditCard, due_day: "" }).success).toBe(false);
  });

  it("strips card fields from a method that is not a card", () => {
    // Someone fills in a limit, then switches the type back to cash.
    const result = paymentMethodInputSchema.safeParse({
      ...creditCard,
      type: "cash",
    });

    expect(result.data).toMatchObject({
      type: "cash",
      credit_limit: null,
      closing_day: null,
      due_day: null,
    });
  });

  it("treats an absent toggle as inactive", () => {
    const { active: _active, ...withoutToggle } = bankAccount;

    expect(paymentMethodInputSchema.safeParse(withoutToggle).data?.active).toBe(false);
  });

  it("rejects an unknown method type", () => {
    expect(paymentMethodInputSchema.safeParse({ ...bankAccount, type: "crypto" }).success).toBe(
      false,
    );
  });

  it("requires a name", () => {
    expect(paymentMethodInputSchema.safeParse({ ...bankAccount, name: " " }).success).toBe(false);
  });

  it("rejects a closing day outside the month", () => {
    expect(paymentMethodInputSchema.safeParse({ ...creditCard, closing_day: "45" }).success).toBe(
      false,
    );
  });
});

describe("categoryInputSchema", () => {
  it("parses a new category", () => {
    const result = categoryInputSchema.safeParse({
      name: "Mascotas",
      sort_order: "100",
      archived: "",
    });

    expect(result.data).toEqual({ name: "Mascotas", sort_order: 100, archived: false });
  });

  it("archives when the toggle is on", () => {
    const result = categoryInputSchema.safeParse({
      name: "Viejo",
      sort_order: "10",
      archived: "on",
    });

    expect(result.data?.archived).toBe(true);
  });

  it("requires a name", () => {
    expect(categoryInputSchema.safeParse({ name: "", sort_order: "0" }).success).toBe(false);
  });
});

describe("profileInputSchema", () => {
  it("accepts a display name", () => {
    expect(profileInputSchema.safeParse({ display_name: " Julián " }).data).toEqual({
      display_name: "Julián",
    });
  });

  it("rejects an empty name", () => {
    expect(profileInputSchema.safeParse({ display_name: "" }).success).toBe(false);
  });
});

describe("householdInputSchema", () => {
  it("accepts a household name", () => {
    expect(householdInputSchema.safeParse({ name: "Nuestra casa" }).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(householdInputSchema.safeParse({ name: "  " }).success).toBe(false);
  });
});
