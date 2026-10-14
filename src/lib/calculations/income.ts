import { isoDateToMonthKey, monthKeyToIsoDate, type MonthKey } from "@/lib/dates/month";
import type {
  IncomeMonthOverrideRow,
  IncomeRow,
  IncomeTemplateAmountRow,
  IncomeTemplateItemRow,
} from "@/types/database";

import { difference, sumBy } from "./money";
import { amountFor } from "./transactions";

export interface ExpectedIncomeRow {
  templateItemId: string;
  userId: string;
  label: string;
  /** The account the income lands in, carried onto the income when it is received. */
  paymentMethodId: string | null;
  amount: number;
  /** True when this month deliberately departs from the global template. */
  isOverridden: boolean;
}

export interface UserIncomeRow {
  userId: string;
  displayName: string;
  expected: number;
  actual: number;
  /** Actual minus expected. Negative means the month fell short. */
  difference: number;
}

/**
 * For each source, the amount of its latest change that has taken effect by
 * `month`. A source that never changed has no entry — its starting amount holds.
 */
function amountChangesInEffect(
  amounts: readonly IncomeTemplateAmountRow[],
  month: MonthKey,
): Map<string, number> {
  const monthStart = monthKeyToIsoDate(month);
  const latest = new Map<string, IncomeTemplateAmountRow>();

  for (const change of amounts) {
    if (change.effective_from > monthStart) {
      continue;
    }
    const current = latest.get(change.template_item_id);
    if (current === undefined || change.effective_from > current.effective_from) {
      latest.set(change.template_item_id, change);
    }
  }

  return new Map([...latest].map(([itemId, change]) => [itemId, change.amount]));
}

/**
 * What a source is expected to bring in `month` before any one-month override:
 * the latest change in effect by then, or the amount it started with.
 */
export function incomeBaseline(
  item: IncomeTemplateItemRow,
  amounts: readonly IncomeTemplateAmountRow[],
  month: MonthKey,
): number {
  return amountChangesInEffect(amounts, month).get(item.id) ?? item.amount;
}

/**
 * Expected income for one month.
 *
 * A source is expected only from the month it starts, so creating one never
 * rewrites months already gone. Its amount is the latest change in effect by
 * that month — a raise in October leaves September as it was — and a month
 * override replaces that for one month only. Inactive sources are left out
 * entirely: that is how a source is retired without erasing what it explained.
 */
export function resolveExpectedIncome(
  templateItems: readonly IncomeTemplateItemRow[],
  amounts: readonly IncomeTemplateAmountRow[],
  overrides: readonly IncomeMonthOverrideRow[],
  month: MonthKey,
): ExpectedIncomeRow[] {
  const monthStart = monthKeyToIsoDate(month);
  const monthOverrides = new Map(
    overrides
      .filter((override) => isoDateToMonthKey(override.month) === month)
      .map((override) => [override.template_item_id, override.amount]),
  );
  const changes = amountChangesInEffect(amounts, month);

  return templateItems
    .filter((item) => item.active && item.starts_on <= monthStart)
    .map((item) => {
      const override = monthOverrides.get(item.id);
      return {
        templateItemId: item.id,
        userId: item.user_id,
        label: item.label,
        paymentMethodId: item.payment_method_id,
        amount: override ?? changes.get(item.id) ?? item.amount,
        isOverridden: override !== undefined,
      };
    });
}

/**
 * The sources already recorded as received in `month` — each income that came
 * from the plan names the source it fulfils.
 */
export function receivedTemplateItemIds(
  incomes: readonly Pick<IncomeRow, "template_item_id" | "occurred_on">[],
  month: MonthKey,
): Set<string> {
  const received = new Set<string>();
  for (const income of incomes) {
    if (income.template_item_id !== null && isoDateToMonthKey(income.occurred_on) === month) {
      received.add(income.template_item_id);
    }
  }
  return received;
}

export function totalExpectedIncome(rows: readonly ExpectedIncomeRow[]): number {
  return sumBy(rows, (row) => row.amount);
}

/** Expected against actual income, one row per household member. */
export function buildIncomeByUser(
  members: readonly { userId: string; displayName: string }[],
  expectedRows: readonly ExpectedIncomeRow[],
  actualByUser: ReadonlyMap<string, number>,
): UserIncomeRow[] {
  return members.map((member) => {
    const expected = sumBy(
      expectedRows.filter((row) => row.userId === member.userId),
      (row) => row.amount,
    );
    const actual = amountFor(actualByUser, member.userId);
    return {
      userId: member.userId,
      displayName: member.displayName,
      expected,
      actual,
      difference: difference(expected, actual),
    };
  });
}
