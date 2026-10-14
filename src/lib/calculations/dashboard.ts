import type { MonthKey } from "@/lib/dates/month";
import type {
  BudgetMonthOverrideRow,
  BudgetTemplateItemRow,
  CategoryRow,
  ExpenseRow,
  IncomeMonthOverrideRow,
  IncomeRow,
  IncomeTemplateAmountRow,
  IncomeTemplateItemRow,
  PaymentMethodRow,
  TransferRow,
} from "@/types/database";

import {
  addPlanned,
  buildCategoryPlan,
  overriddenCategoryIds,
  recurringByCategory,
  resolvePlannedByCategory,
  totalPlanned,
  type CategoryPlanRow,
} from "./budget";
import { buildExpenseBreakdown, type ExpenseBreakdown } from "./breakdown";
import {
  buildCreditCardStatuses,
  cardChargesUpToMonth,
  type CreditCardStatus,
} from "./credit-cards";
import { expensesForMonth } from "./installments";
import {
  buildIncomeByUser,
  resolveExpectedIncome,
  totalExpectedIncome,
  type UserIncomeRow,
} from "./income";
import { difference, percentageOf } from "./money";
import { monthProgress } from "./pace";
import { buildPersonSummaries, type PersonSummary } from "./people";
import { buildMemberSpend, type Member } from "./split";
import { activeOnly, filterByMonth, filterUpToMonth, totalAmount, totalsBy } from "./transactions";

/** Planned against actual for a single headline figure. */
export interface Comparison {
  planned: number;
  actual: number;
  /** Actual minus planned. */
  difference: number;
}

export interface ContributionRow {
  userId: string;
  displayName: string;
  /** What this person carries this month: their own expenses plus their part of the shared ones. */
  spent: number;
  /** Their part of the shared expenses. */
  spentShared: number;
  /** Expenses that were only theirs. */
  spentPersonal: number;
  /** Their part of everything the household spent this month. */
  percentageOfTotal: number;
}

export interface MonthSummary {
  month: MonthKey;
  income: Comparison;
  expenses: Comparison;
  /** What is left over: income less expenses, planned and actual. */
  remaining: Comparison;
  /** How far through the month we are, 0-100 — the plan read at pace. */
  monthProgress: number;
  categoryPlan: CategoryPlanRow[];
  incomeByUser: UserIncomeRow[];
  contributions: ContributionRow[];
  /** The same month read from each person's own side. */
  people: PersonSummary[];
  /** Household spending against each person's own purchases. */
  breakdown: ExpenseBreakdown;
  creditCards: CreditCardStatus[];
}

export interface MonthSummaryInput {
  month: MonthKey;
  /** "Now", passed in rather than read from the clock so this stays pure. */
  reference: Date;
  members: readonly Member[];
  categories: readonly CategoryRow[];
  paymentMethods: readonly PaymentMethodRow[];
  /** All expenses, not just this month's — card debt carries over. */
  expenses: readonly ExpenseRow[];
  incomes: readonly IncomeRow[];
  /** All transfers, for the same reason. */
  transfers: readonly TransferRow[];
  budgetTemplate: readonly BudgetTemplateItemRow[];
  budgetOverrides: readonly BudgetMonthOverrideRow[];
  incomeTemplate: readonly IncomeTemplateItemRow[];
  incomeTemplateAmounts: readonly IncomeTemplateAmountRow[];
  incomeOverrides: readonly IncomeMonthOverrideRow[];
}

function buildContributions(
  members: readonly Member[],
  monthExpenses: readonly ExpenseRow[],
): ContributionRow[] {
  const monthTotal = totalAmount(monthExpenses);

  return buildMemberSpend(members, monthExpenses).map((row) => ({
    userId: row.userId,
    displayName: row.displayName,
    spent: row.total,
    spentShared: row.shared,
    spentPersonal: row.personal,
    percentageOfTotal: percentageOf(row.total, monthTotal),
  }));
}

/**
 * Everything the dashboard renders for one month, derived from raw rows.
 *
 * Two different windows are deliberately in play:
 *   - Income, expenses, each person's part and the plan comparison look at the
 *     selected month only.
 *   - Credit-card debt looks at everything up to the end of that month, because
 *     a card balance does not reset on the first. A payment made in October
 *     therefore correctly clears a debt run up in September.
 */
export function buildMonthSummary(input: MonthSummaryInput): MonthSummary {
  // Switched-off expenses take no part in any total, here or anywhere else.
  const countedExpenses = activeOnly(input.expenses);

  // Month figures use each expense's *share* of the month: a bill covering two
  // months counts half in each, and a card purchase counts its cuota.
  const monthExpenses = expensesForMonth(countedExpenses, input.month);
  const monthIncomes = filterByMonth(input.incomes, input.month);

  // Card debt is the exception: the bank charged the whole principal at once,
  // so it counts the purchases themselves, not the monthly cuotas — and a
  // repeating purchase again on every date it repeats.
  const cardExpensesToDate = cardChargesUpToMonth(countedExpenses, input.month);
  const transfersToDate = filterUpToMonth(input.transfers, input.month);

  const actualByCategory = totalsBy(monthExpenses, (expense) => expense.category_id);
  // What was typed into the plan, plus what the repeating expenses plan on
  // their own — subscriptions and rent never have to be typed in twice.
  const plannedByCategory = addPlanned(
    resolvePlannedByCategory(input.budgetTemplate, input.budgetOverrides, input.month),
    recurringByCategory(countedExpenses, input.month),
  );
  const categoryPlan = buildCategoryPlan(
    input.categories,
    plannedByCategory,
    actualByCategory,
    overriddenCategoryIds(input.budgetOverrides, input.month),
  );

  const expectedIncomeRows = resolveExpectedIncome(
    input.incomeTemplate,
    input.incomeTemplateAmounts,
    input.incomeOverrides,
    input.month,
  );
  const plannedIncome = totalExpectedIncome(expectedIncomeRows);
  const actualIncome = totalAmount(monthIncomes);

  const plannedExpenses = totalPlanned(categoryPlan);
  const actualExpenses = totalAmount(monthExpenses);

  // Hoisted out of the returned object: the per-person summary is built from
  // both of them.
  const incomeByUser = buildIncomeByUser(
    input.members,
    expectedIncomeRows,
    totalsBy(monthIncomes, (income) => income.user_id),
  );
  const contributions = buildContributions(input.members, monthExpenses);

  return {
    month: input.month,
    monthProgress: monthProgress(input.month, input.reference),
    income: {
      planned: plannedIncome,
      actual: actualIncome,
      difference: difference(plannedIncome, actualIncome),
    },
    expenses: {
      planned: plannedExpenses,
      actual: actualExpenses,
      difference: difference(plannedExpenses, actualExpenses),
    },
    remaining: {
      planned: plannedIncome - plannedExpenses,
      actual: actualIncome - actualExpenses,
      difference: difference(plannedIncome - plannedExpenses, actualIncome - actualExpenses),
    },
    categoryPlan,
    incomeByUser,
    contributions,
    people: buildPersonSummaries(input.members, incomeByUser, contributions),
    breakdown: buildExpenseBreakdown(input.members, monthExpenses),
    creditCards: buildCreditCardStatuses(
      input.paymentMethods,
      cardExpensesToDate,
      transfersToDate,
      input.reference,
    ),
  };
}
