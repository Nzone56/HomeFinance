import { addMonths, isAfter, isBefore, startOfDay, subMonths } from "date-fns";

import {
  clampDayToMonth,
  formatIsoDate,
  monthEndIsoDate,
  parseDateOnly,
  type IsoDate,
  type MonthKey,
} from "@/lib/dates/month";
import type { ExpenseRow, PaymentMethodRow, TransferRow } from "@/types/database";

import { percentageOf, sumBy } from "./money";

/**
 * A payment method known to carry the credit-card fields. The database already
 * guarantees they are present for `type = 'credit_card'`; narrowing to this
 * shape means the calculations never deal in nullable limits.
 */
export interface CreditCard {
  id: string;
  userId: string;
  name: string;
  creditLimit: number;
  closingDay: number;
  dueDay: number;
  /** What the card owed before the app knew about it; payments reduce it like any debt. */
  openingDebt: number;
}

/** The statement that closed last, and what of it is still to pay. */
export interface ClosedStatement {
  closingDate: Date;
  dueDate: Date;
  /** What it asked for, less every payment made since it closed. Never negative. */
  unpaid: number;
  /** Still unpaid after its due date. */
  overdue: boolean;
}

export interface CreditCardStatus {
  card: CreditCard;
  /** Outstanding debt: starting debt, purchases and cash advances, less payments made. */
  used: number;
  /** What is still spendable, floored at zero. */
  available: number;
  /** Percentage of the limit consumed, floored at zero. */
  utilization: number;
  /** Charges since the last statement closed — the bill now building up. */
  currentCycleTotal: number;
  /** When the cycle now building up closes. */
  closingDate: Date;
  /** When the cycle now building up must be paid. */
  dueDate: Date;
  /** The debt that belongs to the cycle now building up: all of it beyond the closed statement. */
  cycleOwed: number;
  /** The statement that already closed, which is due before the cycle's bill. */
  statement: ClosedStatement;
}

export function toCreditCards(paymentMethods: readonly PaymentMethodRow[]): CreditCard[] {
  const cards: CreditCard[] = [];
  for (const method of paymentMethods) {
    if (
      method.type !== "credit_card" ||
      method.credit_limit === null ||
      method.closing_day === null ||
      method.due_day === null
    ) {
      continue;
    }
    cards.push({
      id: method.id,
      userId: method.user_id,
      name: method.name,
      creditLimit: method.credit_limit,
      closingDay: method.closing_day,
      dueDay: method.due_day,
      openingDebt: method.opening_debt,
    });
  }
  return cards;
}

/** The first closing date on or after `reference`. */
export function nextClosingDate(reference: Date, closingDay: number): Date {
  const today = startOfDay(reference);
  const thisMonth = startOfDay(clampDayToMonth(today, closingDay));
  return isBefore(thisMonth, today)
    ? startOfDay(clampDayToMonth(addMonths(today, 1), closingDay))
    : thisMonth;
}

/** The last closing date strictly before `reference`. */
export function previousClosingDate(reference: Date, closingDay: number): Date {
  const today = startOfDay(reference);
  const thisMonth = startOfDay(clampDayToMonth(today, closingDay));
  return isBefore(thisMonth, today)
    ? thisMonth
    : startOfDay(clampDayToMonth(subMonths(today, 1), closingDay));
}

/**
 * When the statement closing on `closingDate` must be paid. A due day that
 * falls after the closing day lands in the same month; otherwise it rolls into
 * the next one.
 */
export function dueDateFor(closingDate: Date, dueDay: number): Date {
  const sameMonth = startOfDay(clampDayToMonth(closingDate, dueDay));
  return isAfter(sameMonth, closingDate)
    ? sameMonth
    : startOfDay(clampDayToMonth(addMonths(closingDate, 1), dueDay));
}

/**
 * Every time a purchase hits its card, through the end of `month`.
 *
 * A one-off purchase is charged once, on its date. A repeating one — a
 * subscription — is charged again every `repeat_months` months until
 * `repeat_until`. Each charge carries the full amount: the bank charges the
 * whole principal on the day, even for a purchase a cuotas.
 *
 * Counted once, a monthly subscription on a card stopped adding to its debt
 * after the first month.
 */
export function cardChargesUpToMonth(
  expenses: readonly ExpenseRow[],
  month: MonthKey,
): ExpenseRow[] {
  const monthEnd = monthEndIsoDate(month);

  return expenses.flatMap((expense) => {
    const last =
      expense.repeat_until !== null && expense.repeat_until < monthEnd
        ? expense.repeat_until
        : monthEnd;
    const start = parseDateOnly(expense.occurred_on);
    const charges: ExpenseRow[] = [];

    let offset = 0;
    let date: IsoDate = expense.occurred_on;
    while (date <= last) {
      charges.push({ ...expense, occurred_on: date });
      if (expense.repeat_months === null) {
        break;
      }
      offset += expense.repeat_months;
      // Always from the first date, so a charge on the 31st returns to the 31st
      // after landing on the 28th in February.
      date = formatIsoDate(addMonths(start, offset));
    }

    return charges;
  });
}

/** Debt from the starting balance and whichever movements `counts` lets through. */
function debtFrom(
  card: Pick<CreditCard, "id" | "openingDebt">,
  expenses: readonly ExpenseRow[],
  transfers: readonly TransferRow[],
  counts: (occurredOn: IsoDate) => boolean,
): number {
  const purchases = sumBy(
    expenses.filter(
      (expense) => expense.payment_method_id === card.id && counts(expense.occurred_on),
    ),
    (expense) => expense.amount,
  );
  const advances = sumBy(
    transfers.filter(
      (transfer) => transfer.from_payment_method_id === card.id && counts(transfer.occurred_on),
    ),
    (transfer) => transfer.amount,
  );
  const payments = sumBy(
    transfers.filter(
      (transfer) => transfer.to_payment_method_id === card.id && counts(transfer.occurred_on),
    ),
    (transfer) => transfer.amount,
  );
  return card.openingDebt + purchases + advances - payments;
}

/**
 * Outstanding debt on a card.
 *
 * It starts from the debt the card carried before the app knew about it.
 * Purchases and cash advances increase it; a transfer into the card is a
 * payment and reduces it. This is the single place that keeps a credit-card
 * expense from being counted twice: the purchase is an expense, paying the card
 * off is a transfer, and only the purchase ever reaches the expense totals.
 *
 * Without the starting debt, paying a real statement drove the debt below zero:
 * the app only knew the purchases recorded since.
 */
export function creditCardUsed(
  card: Pick<CreditCard, "id" | "openingDebt">,
  expenses: readonly ExpenseRow[],
  transfers: readonly TransferRow[],
): number {
  return debtFrom(card, expenses, transfers, () => true);
}

/**
 * A card's debt, its headroom, and the two bills it has open.
 *
 * A card owes two different bills on two different dates. A card closing on
 * the 13th and due on the 3rd owes what closed on 13 September by 3 October,
 * and what it charges from the 14th to 13 October by 3 November. Putting all
 * of the debt against the later date pushed a bill due in three weeks two
 * months out.
 *
 * A payment settles the statement that closed before it counts toward the
 * cycle building up now — which is how the bank applies it too.
 */
export function buildCreditCardStatus(
  card: CreditCard,
  expenses: readonly ExpenseRow[],
  transfers: readonly TransferRow[],
  reference: Date,
): CreditCardStatus {
  const used = creditCardUsed(card, expenses, transfers);
  const closingDate = nextClosingDate(reference, card.closingDay);
  const cycleStart = previousClosingDate(reference, card.closingDay);
  const closedBy = (occurredOn: IsoDate) => !isAfter(parseDateOnly(occurredOn), cycleStart);

  const currentCycleTotal = sumBy(
    expenses.filter((expense) => {
      if (expense.payment_method_id !== card.id) {
        return false;
      }
      const occurredOn = parseDateOnly(expense.occurred_on);
      return isAfter(occurredOn, cycleStart) && !isAfter(occurredOn, closingDate);
    }),
    (expense) => expense.amount,
  );

  const owedAtClosing = debtFrom(card, expenses, transfers, closedBy);
  const paidSinceClosing = sumBy(
    transfers.filter(
      (transfer) => transfer.to_payment_method_id === card.id && !closedBy(transfer.occurred_on),
    ),
    (transfer) => transfer.amount,
  );
  const unpaid = Math.max(owedAtClosing - paidSinceClosing, 0);
  const statementDueDate = dueDateFor(cycleStart, card.dueDay);

  return {
    card,
    used,
    available: Math.max(card.creditLimit - used, 0),
    utilization: Math.max(percentageOf(used, card.creditLimit), 0),
    currentCycleTotal,
    closingDate,
    dueDate: dueDateFor(closingDate, card.dueDay),
    cycleOwed: used - unpaid,
    statement: {
      closingDate: cycleStart,
      dueDate: statementDueDate,
      unpaid,
      overdue: unpaid > 0 && isBefore(statementDueDate, startOfDay(reference)),
    },
  };
}

/**
 * Card status for every credit card in the household.
 *
 * Debt is cumulative, so this deliberately takes *all* charges and transfers
 * rather than one month's worth: a balance does not reset on the first.
 */
export function buildCreditCardStatuses(
  paymentMethods: readonly PaymentMethodRow[],
  expenses: readonly ExpenseRow[],
  transfers: readonly TransferRow[],
  reference: Date,
): CreditCardStatus[] {
  return toCreditCards(paymentMethods).map((card) =>
    buildCreditCardStatus(card, expenses, transfers, reference),
  );
}
