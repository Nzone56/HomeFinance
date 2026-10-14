import { describe, expect, it } from "vitest";

import { content } from "@/content/es";
import { GF, JULIAN, makeCategory, makeCreditCard, makePaymentMethod } from "@/test/factories";

import {
  categoryOptions,
  memberOptions,
  paymentMethodOptions,
  paymentMethodTypeOptions,
} from "./options";

describe("categoryOptions", () => {
  it("offers the household's categories", () => {
    const categories = [
      makeCategory({ id: "rent", name: "Arriendo" }),
      makeCategory({ id: "food", name: "Mercado" }),
    ];

    expect(categoryOptions(categories)).toEqual([
      { value: "rent", label: "Arriendo" },
      { value: "food", label: "Mercado" },
    ]);
  });

  it("leaves archived categories out, so nothing new is filed against them", () => {
    const categories = [
      makeCategory({ id: "rent", name: "Arriendo" }),
      makeCategory({ id: "old", name: "Viejo", archived: true }),
    ];

    expect(categoryOptions(categories).map((option) => option.value)).toEqual(["rent"]);
  });

  it("offers nothing when there are no categories", () => {
    expect(categoryOptions([])).toEqual([]);
  });
});

describe("paymentMethodOptions", () => {
  const names = new Map([
    [JULIAN, "Julián"],
    [GF, "GF"],
  ]);

  it("labels each method with its owner, so two similar accounts differ", () => {
    const methods = [
      makePaymentMethod({ id: "j-bank", name: "Bancolombia", user_id: JULIAN }),
      makePaymentMethod({ id: "g-bank", name: "Bancolombia", user_id: GF }),
    ];

    expect(paymentMethodOptions(methods, names)).toEqual([
      {
        value: "j-bank",
        label: "Bancolombia · Julián",
        isCreditCard: false,
        defaultRatePercent: null,
      },
      { value: "g-bank", label: "Bancolombia · GF", isCreditCard: false, defaultRatePercent: null },
    ]);
  });

  it("leaves deactivated methods out", () => {
    const methods = [
      makePaymentMethod({ id: "live", user_id: JULIAN }),
      makePaymentMethod({ id: "closed", user_id: JULIAN, active: false }),
    ];

    expect(paymentMethodOptions(methods, names).map((option) => option.value)).toEqual(["live"]);
  });

  it("falls back to the bare name when the owner is unknown", () => {
    const methods = [makePaymentMethod({ id: "orphan", name: "Efectivo", user_id: "ghost" })];

    expect(paymentMethodOptions(methods, names)).toEqual([
      { value: "orphan", label: "Efectivo", isCreditCard: false, defaultRatePercent: null },
    ]);
  });
  it("marks a credit card and carries its default rate, for the cuotas fields", () => {
    const card = makeCreditCard({
      id: "tc1",
      name: "TC1",
      user_id: JULIAN,
      default_annual_rate_percent: 28.5,
    });

    expect(paymentMethodOptions([card], names)).toEqual([
      { value: "tc1", label: "TC1 · Julián", isCreditCard: true, defaultRatePercent: 28.5 },
    ]);
  });
});

describe("memberOptions", () => {
  it("offers each member by display name", () => {
    expect(
      memberOptions([
        { userId: JULIAN, displayName: "Julián" },
        { userId: GF, displayName: "GF" },
      ]),
    ).toEqual([
      { value: JULIAN, label: "Julián" },
      { value: GF, label: "GF" },
    ]);
  });
});

describe("paymentMethodTypeOptions", () => {
  it("offers every type the database allows, in Spanish", () => {
    expect(paymentMethodTypeOptions()).toEqual([
      { value: "bank_account", label: content.paymentMethodType.bank_account },
      { value: "benefits_card", label: content.paymentMethodType.benefits_card },
      { value: "credit_card", label: content.paymentMethodType.credit_card },
      { value: "cash", label: content.paymentMethodType.cash },
    ]);
  });
});
