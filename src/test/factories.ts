import type { Member } from "@/lib/calculations/split";
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

/**
 * Row builders for tests. Every field has a sane default so a test only states
 * the values it actually cares about.
 */

const HOUSEHOLD_ID = "household-1";
const CREATED_AT = "2026-09-01T00:00:00.000Z";

export const JULIAN = "user-julian";
export const GF = "user-gf";

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}-${sequence}`;
}

export function makeCategory(overrides: Partial<CategoryRow> = {}): CategoryRow {
  return {
    id: nextId("category"),
    household_id: HOUSEHOLD_ID,
    name: "Mercado",
    sort_order: 0,
    archived: false,
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makePaymentMethod(overrides: Partial<PaymentMethodRow> = {}): PaymentMethodRow {
  return {
    id: nextId("method"),
    household_id: HOUSEHOLD_ID,
    user_id: JULIAN,
    name: "Cuenta de nómina",
    type: "bank_account",
    active: true,
    credit_limit: null,
    closing_day: null,
    due_day: null,
    default_annual_rate_percent: null,
    opening_debt: 0,
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makeCreditCard(overrides: Partial<PaymentMethodRow> = {}): PaymentMethodRow {
  return makePaymentMethod({
    name: "Tarjeta de crédito 1",
    type: "credit_card",
    credit_limit: 5_000_000,
    closing_day: 15,
    due_day: 5,
    ...overrides,
  });
}

export function makeExpense(overrides: Partial<ExpenseRow> = {}): ExpenseRow {
  return {
    id: nextId("expense"),
    household_id: HOUSEHOLD_ID,
    user_id: JULIAN,
    payment_method_id: "method-1",
    category_id: "category-1",
    amount: 100_000,
    description: "Gasto",
    occurred_on: "2026-09-10",
    shared: true,
    payer_share_percent: 50,
    active: true,
    installments: 1,
    annual_rate_percent: null,
    repeat_months: null,
    repeat_until: null,
    notes: null,
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makeIncome(overrides: Partial<IncomeRow> = {}): IncomeRow {
  return {
    id: nextId("income"),
    household_id: HOUSEHOLD_ID,
    user_id: JULIAN,
    payment_method_id: null,
    amount: 1_000_000,
    label: "Nómina",
    occurred_on: "2026-09-01",
    notes: null,
    template_item_id: null,
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makeTransfer(overrides: Partial<TransferRow> = {}): TransferRow {
  return {
    id: nextId("transfer"),
    household_id: HOUSEHOLD_ID,
    user_id: JULIAN,
    from_payment_method_id: "method-1",
    to_payment_method_id: "method-2",
    amount: 100_000,
    occurred_on: "2026-09-20",
    notes: null,
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makeBudgetTemplateItem(
  overrides: Partial<BudgetTemplateItemRow> = {},
): BudgetTemplateItemRow {
  return {
    id: nextId("budget-template"),
    household_id: HOUSEHOLD_ID,
    category_id: "category-1",
    amount: 500_000,
    effective_from: "2026-01-01",
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makeBudgetOverride(
  overrides: Partial<BudgetMonthOverrideRow> = {},
): BudgetMonthOverrideRow {
  return {
    id: nextId("budget-override"),
    household_id: HOUSEHOLD_ID,
    month: "2026-09-01",
    category_id: "category-1",
    amount: 700_000,
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makeIncomeTemplateItem(
  overrides: Partial<IncomeTemplateItemRow> = {},
): IncomeTemplateItemRow {
  return {
    id: nextId("income-template"),
    household_id: HOUSEHOLD_ID,
    user_id: JULIAN,
    label: "Nómina",
    amount: 4_000_000,
    active: true,
    starts_on: "2026-01-01",
    payment_method_id: null,
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makeIncomeTemplateAmount(
  overrides: Partial<IncomeTemplateAmountRow> = {},
): IncomeTemplateAmountRow {
  return {
    id: nextId("income-amount"),
    household_id: HOUSEHOLD_ID,
    template_item_id: "income-template-1",
    effective_from: "2026-10-01",
    amount: 5_000_000,
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makeIncomeOverride(
  overrides: Partial<IncomeMonthOverrideRow> = {},
): IncomeMonthOverrideRow {
  return {
    id: nextId("income-override"),
    household_id: HOUSEHOLD_ID,
    month: "2026-09-01",
    template_item_id: "income-template-1",
    amount: 3_000_000,
    created_at: CREATED_AT,
    ...overrides,
  };
}

export function makeMember(overrides: Partial<Member> = {}): Member {
  return {
    userId: JULIAN,
    displayName: "Julián",
    ...overrides,
  };
}

/** The two-person household the app is built for. */
export function makeCouple(): Member[] {
  return [
    makeMember({ userId: JULIAN, displayName: "Julián" }),
    makeMember({ userId: GF, displayName: "GF" }),
  ];
}
