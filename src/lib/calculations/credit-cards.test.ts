import { describe, expect, it } from "vitest";

import { formatIsoDate } from "@/lib/dates/month";
import { makeCreditCard, makeExpense, makePaymentMethod, makeTransfer } from "@/test/factories";

import {
  buildCreditCardStatus,
  buildCreditCardStatuses,
  cardChargesUpToMonth,
  creditCardUsed,
  dueDateFor,
  nextClosingDate,
  previousClosingDate,
  toCreditCards,
  type CreditCard,
} from "./credit-cards";

const CARD: CreditCard = {
  id: "card-1",
  userId: "user-julian",
  name: "Tarjeta de crédito 1",
  creditLimit: 5_000_000,
  closingDay: 15,
  dueDay: 5,
  openingDebt: 0,
};

/** The same card as `creditCardUsed` sees it, with no debt from before the app. */
const PLAIN_CARD = { id: "card-1", openingDebt: 0 };

/** 11 September 2026 — before the 15th, so mid-cycle. */
const REFERENCE = new Date(2026, 8, 11);

describe("toCreditCards", () => {
  it("keeps credit cards and drops every other payment method", () => {
    const methods = [
      makeCreditCard({ id: "card", name: "TC1" }),
      makePaymentMethod({ id: "bank", type: "bank_account" }),
      makePaymentMethod({ id: "cash", type: "cash" }),
      makePaymentMethod({ id: "benefits", type: "benefits_card" }),
    ];

    expect(toCreditCards(methods).map((card) => card.id)).toEqual(["card"]);
  });

  it("maps the card fields across", () => {
    const method = makeCreditCard({
      id: "card",
      name: "TC1",
      user_id: "user-gf",
      credit_limit: 3_000_000,
      closing_day: 20,
      due_day: 10,
      opening_debt: 250_000,
    });

    expect(toCreditCards([method])).toEqual([
      {
        id: "card",
        userId: "user-gf",
        name: "TC1",
        creditLimit: 3_000_000,
        closingDay: 20,
        dueDay: 10,
        openingDebt: 250_000,
      },
    ]);
  });

  it("skips a card row missing the fields the calculations need", () => {
    expect(toCreditCards([makeCreditCard({ credit_limit: null })])).toEqual([]);
    expect(toCreditCards([makeCreditCard({ closing_day: null })])).toEqual([]);
    expect(toCreditCards([makeCreditCard({ due_day: null })])).toEqual([]);
  });

  it("returns nothing for an empty wallet", () => {
    expect(toCreditCards([])).toEqual([]);
  });
});

describe("nextClosingDate", () => {
  it("closes later this month when the day has not passed", () => {
    expect(formatIsoDate(nextClosingDate(REFERENCE, 15))).toBe("2026-09-15");
  });

  it("closes today when today is the closing day", () => {
    expect(formatIsoDate(nextClosingDate(new Date(2026, 8, 15), 15))).toBe("2026-09-15");
  });

  it("rolls into next month once the day has passed", () => {
    expect(formatIsoDate(nextClosingDate(new Date(2026, 8, 20), 15))).toBe("2026-10-15");
  });

  it("clamps a closing day that the month does not have", () => {
    expect(formatIsoDate(nextClosingDate(new Date(2026, 1, 10), 31))).toBe("2026-02-28");
  });

  it("crosses the year boundary", () => {
    expect(formatIsoDate(nextClosingDate(new Date(2026, 11, 20), 15))).toBe("2027-01-15");
  });
});

describe("previousClosingDate", () => {
  it("looks back to last month when this month has not closed yet", () => {
    expect(formatIsoDate(previousClosingDate(REFERENCE, 15))).toBe("2026-08-15");
  });

  it("looks back to last month when today is the closing day", () => {
    expect(formatIsoDate(previousClosingDate(new Date(2026, 8, 15), 15))).toBe("2026-08-15");
  });

  it("uses this month once the day has passed", () => {
    expect(formatIsoDate(previousClosingDate(new Date(2026, 8, 20), 15))).toBe("2026-09-15");
  });

  it("clamps to a short month", () => {
    expect(formatIsoDate(previousClosingDate(new Date(2026, 2, 1), 31))).toBe("2026-02-28");
  });
});

describe("dueDateFor", () => {
  it("stays in the closing month when payment is due after closing", () => {
    expect(formatIsoDate(dueDateFor(new Date(2026, 8, 15), 25))).toBe("2026-09-25");
  });

  it("rolls into the next month when payment is due before closing", () => {
    expect(formatIsoDate(dueDateFor(new Date(2026, 8, 15), 5))).toBe("2026-10-05");
  });

  it("rolls into the next month when the due day equals the closing day", () => {
    expect(formatIsoDate(dueDateFor(new Date(2026, 8, 15), 15))).toBe("2026-10-15");
  });

  it("clamps a due day the next month does not have", () => {
    expect(formatIsoDate(dueDateFor(new Date(2026, 0, 31), 31))).toBe("2026-02-28");
  });
});

describe("cardChargesUpToMonth", () => {
  const datesOf = (charges: { occurred_on: string }[]) =>
    charges.map((charge) => charge.occurred_on);

  it("charges a one-off purchase once, on its date", () => {
    const charges = cardChargesUpToMonth(
      [makeExpense({ occurred_on: "2026-09-13", amount: 95_000 })],
      "2026-12",
    );

    expect(charges.map((charge) => [charge.occurred_on, charge.amount])).toEqual([
      ["2026-09-13", 95_000],
    ]);
  });

  it("leaves out anything charged after the month", () => {
    expect(cardChargesUpToMonth([makeExpense({ occurred_on: "2026-10-01" })], "2026-09")).toEqual(
      [],
    );
  });

  it("charges a subscription again every month it repeats (regression)", () => {
    // Counted once, a monthly subscription stopped adding to card debt after
    // its first month.
    const smartFit = makeExpense({ occurred_on: "2026-09-13", amount: 95_000, repeat_months: 1 });

    expect(datesOf(cardChargesUpToMonth([smartFit], "2026-11"))).toEqual([
      "2026-09-13",
      "2026-10-13",
      "2026-11-13",
    ]);
  });

  it("stops at the repeat's end date", () => {
    const rent = makeExpense({
      occurred_on: "2026-09-13",
      repeat_months: 1,
      repeat_until: "2026-10-31",
    });

    expect(datesOf(cardChargesUpToMonth([rent], "2026-12"))).toEqual(["2026-09-13", "2026-10-13"]);
  });

  it("keeps to the month when the end date is still to come", () => {
    const water = makeExpense({
      occurred_on: "2026-09-13",
      repeat_months: 2,
      repeat_until: "2027-06-30",
    });

    expect(datesOf(cardChargesUpToMonth([water], "2026-11"))).toEqual(["2026-09-13", "2026-11-13"]);
  });

  it("lands on the last day of a month too short for the date, then returns to it", () => {
    const bill = makeExpense({ occurred_on: "2026-01-31", repeat_months: 1 });

    expect(datesOf(cardChargesUpToMonth([bill], "2026-03"))).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("charges the whole principal of a purchase a cuotas", () => {
    const tv = makeExpense({ occurred_on: "2026-09-13", amount: 1_200_000, installments: 12 });

    expect(cardChargesUpToMonth([tv], "2026-09").at(0)?.amount).toBe(1_200_000);
  });
});

describe("creditCardUsed", () => {
  it("adds up purchases put on the card", () => {
    const expenses = [
      makeExpense({ payment_method_id: "card-1", amount: 80_000 }),
      makeExpense({ payment_method_id: "card-1", amount: 120_000 }),
    ];

    expect(creditCardUsed(PLAIN_CARD, expenses, [])).toBe(200_000);
  });

  it("ignores spending on other payment methods", () => {
    const expenses = [
      makeExpense({ payment_method_id: "card-1", amount: 80_000 }),
      makeExpense({ payment_method_id: "bank", amount: 900_000 }),
    ];

    expect(creditCardUsed(PLAIN_CARD, expenses, [])).toBe(80_000);
  });

  it("treats a transfer into the card as a payment, not a second expense", () => {
    const expenses = [makeExpense({ payment_method_id: "card-1", amount: 80_000 })];
    const transfers = [
      makeTransfer({
        from_payment_method_id: "bank",
        to_payment_method_id: "card-1",
        amount: 80_000,
      }),
    ];

    expect(creditCardUsed(PLAIN_CARD, expenses, transfers)).toBe(0);
  });

  it("treats a transfer out of the card as a cash advance", () => {
    const transfers = [
      makeTransfer({
        from_payment_method_id: "card-1",
        to_payment_method_id: "bank",
        amount: 300_000,
      }),
    ];

    expect(creditCardUsed(PLAIN_CARD, [], transfers)).toBe(300_000);
  });

  it("goes negative when the card has been overpaid", () => {
    const transfers = [
      makeTransfer({
        from_payment_method_id: "bank",
        to_payment_method_id: "card-1",
        amount: 50_000,
      }),
    ];

    expect(creditCardUsed(PLAIN_CARD, [], transfers)).toBe(-50_000);
  });

  it("starts from the debt the card carried before the app knew about it", () => {
    const expenses = [makeExpense({ payment_method_id: "card-1", amount: 170_000 })];

    expect(creditCardUsed({ id: "card-1", openingDebt: 808_307 }, expenses, [])).toBe(978_307);
  });

  it("lets a statement payment clear debt from before the app instead of going negative (regression)", () => {
    // A 978.307 payment on a card the app knew only 170.000 of read -808.307.
    const expenses = [makeExpense({ payment_method_id: "card-1", amount: 170_000 })];
    const transfers = [
      makeTransfer({
        from_payment_method_id: "bank",
        to_payment_method_id: "card-1",
        amount: 978_307,
      }),
    ];

    expect(creditCardUsed({ id: "card-1", openingDebt: 808_307 }, expenses, transfers)).toBe(0);
  });

  it("owes nothing on an unused card", () => {
    expect(creditCardUsed(PLAIN_CARD, [], [])).toBe(0);
  });
});

describe("buildCreditCardStatus", () => {
  it("reports debt, headroom and the cycle dates", () => {
    const expenses = [
      makeExpense({ payment_method_id: "card-1", amount: 1_000_000, occurred_on: "2026-09-10" }),
    ];

    const status = buildCreditCardStatus(CARD, expenses, [], REFERENCE);

    expect(status.used).toBe(1_000_000);
    expect(status.available).toBe(4_000_000);
    expect(status.utilization).toBe(20);
    expect(formatIsoDate(status.closingDate)).toBe("2026-09-15");
    expect(formatIsoDate(status.dueDate)).toBe("2026-10-05");
  });

  it("counts only charges made since the last statement closed", () => {
    const expenses = [
      // The cycle runs from 15 Aug (exclusive) to 15 Sep (inclusive).
      makeExpense({ payment_method_id: "card-1", amount: 1, occurred_on: "2026-08-15" }),
      makeExpense({ payment_method_id: "card-1", amount: 10, occurred_on: "2026-08-16" }),
      makeExpense({ payment_method_id: "card-1", amount: 100, occurred_on: "2026-09-15" }),
      makeExpense({ payment_method_id: "card-1", amount: 1_000, occurred_on: "2026-09-16" }),
      makeExpense({ payment_method_id: "bank", amount: 10_000, occurred_on: "2026-09-01" }),
    ];

    expect(buildCreditCardStatus(CARD, expenses, [], REFERENCE).currentCycleTotal).toBe(110);
  });

  describe("the two bills a card has open", () => {
    /** Closes on the 13th, due on the 3rd. */
    const NU: CreditCard = {
      ...CARD,
      id: "nu",
      creditLimit: 12_000_000,
      closingDay: 13,
      dueDay: 3,
    };
    /** The day after it closed. */
    const DAY_AFTER_CLOSING = new Date(2026, 8, 14, 0, 48);

    const purchase = (amount: number, occurredOn: string) =>
      makeExpense({ payment_method_id: "nu", amount, occurred_on: occurredOn });
    const payment = (amount: number, occurredOn: string) =>
      makeTransfer({
        from_payment_method_id: "bank",
        to_payment_method_id: "nu",
        amount,
        occurred_on: occurredOn,
      });

    it("owes what closed by its own due date, and what came after by the next (regression)", () => {
      // All the debt sat against 3 nov, although what closed on 13 sep is due on 3 oct.
      const subscriptions = [95_000, 50_000, 25_000].map((amount) =>
        purchase(amount, "2026-09-13"),
      );

      const status = buildCreditCardStatus(
        { ...NU, openingDebt: 978_307 },
        subscriptions,
        [payment(978_307, "2026-09-14")],
        DAY_AFTER_CLOSING,
      );

      expect(formatIsoDate(status.statement.closingDate)).toBe("2026-09-13");
      expect(formatIsoDate(status.statement.dueDate)).toBe("2026-10-03");
      expect(status.statement.unpaid).toBe(170_000);
      expect(status.statement.overdue).toBe(false);
      expect(formatIsoDate(status.closingDate)).toBe("2026-10-13");
      expect(formatIsoDate(status.dueDate)).toBe("2026-11-03");
      expect(status.cycleOwed).toBe(0);
      expect(status.used).toBe(170_000);
    });

    it("puts a purchase made after closing on the next bill", () => {
      const status = buildCreditCardStatus(
        NU,
        [purchase(80_000, "2026-09-14")],
        [],
        DAY_AFTER_CLOSING,
      );

      expect(status.statement.unpaid).toBe(0);
      expect(status.cycleOwed).toBe(80_000);
    });

    it("settles the closed statement first and carries the rest of a payment to the next bill", () => {
      const status = buildCreditCardStatus(
        NU,
        [purchase(100_000, "2026-09-10"), purchase(60_000, "2026-09-20")],
        [payment(130_000, "2026-09-15")],
        DAY_AFTER_CLOSING,
      );

      expect(status.statement.unpaid).toBe(0);
      expect(status.cycleOwed).toBe(30_000);
    });

    it("counts a payment made before closing against the statement it closed into", () => {
      const status = buildCreditCardStatus(
        NU,
        [purchase(100_000, "2026-09-01")],
        [payment(40_000, "2026-09-05")],
        DAY_AFTER_CLOSING,
      );

      expect(status.statement.unpaid).toBe(60_000);
      expect(status.cycleOwed).toBe(0);
    });

    it("marks a statement still unpaid after its due date as overdue", () => {
      const status = buildCreditCardStatus(
        NU,
        [purchase(200_000, "2026-09-10")],
        [],
        new Date(2026, 9, 5),
      );

      expect(status.statement.unpaid).toBe(200_000);
      expect(status.statement.overdue).toBe(true);
    });

    it("is not overdue on the due date itself", () => {
      const status = buildCreditCardStatus(
        NU,
        [purchase(200_000, "2026-09-10")],
        [],
        new Date(2026, 9, 3, 18),
      );

      expect(status.statement.overdue).toBe(false);
    });
  });

  it("floors available credit at zero when the limit is blown", () => {
    const expenses = [makeExpense({ payment_method_id: "card-1", amount: 6_000_000 })];

    const status = buildCreditCardStatus(CARD, expenses, [], REFERENCE);

    expect(status.used).toBe(6_000_000);
    expect(status.available).toBe(0);
    expect(status.utilization).toBe(120);
  });

  it("reports zero utilisation when the card carries a credit balance", () => {
    const transfers = [
      makeTransfer({
        from_payment_method_id: "bank",
        to_payment_method_id: "card-1",
        amount: 200_000,
      }),
    ];

    const status = buildCreditCardStatus(CARD, [], transfers, REFERENCE);

    expect(status.used).toBe(-200_000);
    expect(status.utilization).toBe(0);
    expect(status.available).toBe(5_200_000);
  });

  it("takes the starting debt off what is still available", () => {
    const status = buildCreditCardStatus({ ...CARD, openingDebt: 1_500_000 }, [], [], REFERENCE);

    expect(status.used).toBe(1_500_000);
    expect(status.available).toBe(3_500_000);
    expect(status.utilization).toBe(30);
  });

  it("reports an untouched card as fully available", () => {
    const status = buildCreditCardStatus(CARD, [], [], REFERENCE);

    expect(status).toMatchObject({
      used: 0,
      available: 5_000_000,
      utilization: 0,
      currentCycleTotal: 0,
      cycleOwed: 0,
      statement: { unpaid: 0, overdue: false },
    });
  });
});

describe("buildCreditCardStatuses", () => {
  it("reports on every credit card and skips the other methods", () => {
    const methods = [
      makeCreditCard({ id: "card-1", name: "TC1" }),
      makeCreditCard({ id: "card-2", name: "TC2", credit_limit: 2_000_000 }),
      makePaymentMethod({ id: "bank" }),
    ];
    const expenses = [makeExpense({ payment_method_id: "card-2", amount: 500_000 })];

    const statuses = buildCreditCardStatuses(methods, expenses, [], REFERENCE);

    expect(statuses.map((status) => status.card.id)).toEqual(["card-1", "card-2"]);
    expect(statuses.map((status) => status.used)).toEqual([0, 500_000]);
  });

  it("returns nothing when the household has no credit cards", () => {
    expect(buildCreditCardStatuses([makePaymentMethod()], [], [], REFERENCE)).toEqual([]);
  });
});
