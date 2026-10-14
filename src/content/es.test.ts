import { describe, expect, it } from "vitest";

import {
  closedStatementDue,
  content,
  openCycleDue,
  householdShareLabel,
  installmentLabel,
  overBudgetSummary,
  ratePercent,
  repeatEvery,
  payerWithMethod,
  splitSummary,
  recurringNote,
  ofIncomeTotal,
  spreadLabel,
} from "./es";

describe("closedStatementDue and openCycleDue", () => {
  it("tell a closed statement from the cycle still building up", () => {
    expect(closedStatementDue("3 oct", "13 sep")).toBe("3 oct · cerró el 13 sep");
    expect(openCycleDue("3 nov", "13 oct")).toBe("3 nov · cierra el 13 oct");
  });
});

describe("ofIncomeTotal", () => {
  it("names the income a month's spending is measured against", () => {
    expect(ofIncomeTotal("$ 4.000.000")).toBe("de $ 4.000.000 de ingresos");
  });
});

describe("recurringNote", () => {
  it("says how much of a category plans itself from repeating expenses", () => {
    expect(recurringNote("$ 65.000")).toBe("Se suma a $ 65.000 de gastos que se repiten.");
  });
});

describe("splitSummary", () => {
  it("names each person with their part of a shared expense", () => {
    expect(
      splitSummary([
        { name: "Julián", percent: 60 },
        { name: "GF", percent: 40 },
      ]),
    ).toBe("Julián 60% · GF 40%");
  });
});

describe("householdShareLabel", () => {
  it("says what part of the month the household spent together", () => {
    expect(householdShareLabel(80)).toBe("80% de los gastos del mes");
  });
});

describe("payerWithMethod", () => {
  it("joins the payer and the payment method", () => {
    expect(payerWithMethod("Julián", "Tarjeta de crédito 1")).toBe("Julián · Tarjeta de crédito 1");
  });
});

describe("overBudgetSummary", () => {
  it("agrees with the total rather than the count in front of it", () => {
    // The bug this replaced read "1 de 6 categoría sobre el plan".
    expect(overBudgetSummary(1, 9)).toBe("1 de 9 categorías sobre el plan");
    expect(overBudgetSummary(3, 9)).toBe("3 de 9 categorías sobre el plan");
    expect(overBudgetSummary(0, 9)).toBe("0 de 9 categorías sobre el plan");
  });

  it("uses the singular for a household with one category to its name", () => {
    expect(overBudgetSummary(1, 1)).toBe("1 de 1 categoría sobre el plan");
  });
});

describe("repeatEvery", () => {
  it("uses the word for a bill that comes every month", () => {
    expect(repeatEvery(1)).toBe(content.expenses.repeatMonthly);
  });

  it("counts the months for anything less often", () => {
    expect(repeatEvery(2)).toBe("Cada 2 meses");
    expect(repeatEvery(12)).toBe("Cada 12 meses");
  });
});

describe("ratePercent", () => {
  it("writes the rate the way Colombia does", () => {
    expect(ratePercent(28.5)).toBe("28,5 %EA");
    expect(ratePercent(0)).toBe("0 %EA");
  });
});

describe("installmentLabel", () => {
  it("names the cuota and how many there are", () => {
    expect(installmentLabel(3, 12)).toBe("Cuota 3 de 12");
  });
});

describe("spreadLabel", () => {
  it("says how many months a bill covers", () => {
    expect(spreadLabel(2)).toBe("Se reparte en 2 meses");
  });
});

describe("content", () => {
  it("names every payment method type the database allows", () => {
    expect(Object.keys(content.paymentMethodType)).toEqual([
      "bank_account",
      "benefits_card",
      "credit_card",
      "cash",
    ]);
  });

  it("is written in Spanish, not English", () => {
    expect(content.nav.dashboard).toBe("Resumen");
    expect(content.common.save).toBe("Guardar");
    expect(content.auth.submit).toBe("Entrar");
  });
});
