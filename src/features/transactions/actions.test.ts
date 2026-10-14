import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { IDLE_STATE } from "@/lib/actions/state";
import { requireHouseholdContext } from "@/lib/data/household";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatIsoDate } from "@/lib/dates/month";
import { makeIncome, makeIncomeTemplateItem } from "@/test/factories";
import { createSupabaseMock, postgrestError, type SupabaseMock } from "@/test/supabase-mock";

import {
  createExpense,
  createIncome,
  createTransfer,
  deleteExpense,
  deleteIncome,
  deleteTransfer,
  receiveExpectedIncome,
  setExpenseActive,
  updateExpense,
} from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/household", () => ({ requireHouseholdContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

const CATEGORY = "11111111-1111-4111-8111-111111111111";
const METHOD = "22222222-2222-4222-8222-222222222222";
const OTHER_METHOD = "33333333-3333-4333-8333-333333333333";
const USER = "44444444-4444-4444-8444-444444444444";
const ROW = "55555555-5555-4555-8555-555555555555";

let mock: SupabaseMock;

function formOf(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

beforeEach(() => {
  mock = createSupabaseMock();
  vi.mocked(requireHouseholdContext).mockResolvedValue({
    userId: USER,
    household: { id: "household-1", name: "Nuestra casa", created_at: "2026-01-01" },
    members: [],
  });
  vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);
});

const validExpense = {
  description: "Recibo del agua",
  amount: "80.000",
  occurred_on: "2026-09-11",
  category_id: CATEGORY,
  payment_method_id: METHOD,
  user_id: USER,
  shared: "on",
};

describe("updateExpense", () => {
  const edit = { ...validExpense, id: ROW, description: "Recibo del agua corregido" };

  it("writes the new values to that row and no other", async () => {
    const state = await updateExpense(IDLE_STATE, formOf(edit));

    expect(state).toEqual({ status: "success", message: content.expenses.updated });
    expect(mock.queryFor("expenses")).toMatchObject({
      operation: "update",
      values: { description: "Recibo del agua corregido", amount: 80_000 },
      filters: [["id", ROW]],
    });
  });

  it("never sends the household with the values it writes", async () => {
    // The row already belongs to one, and Row Level Security is what decides
    // whether this write is allowed at all.
    await updateExpense(IDLE_STATE, formOf({ ...edit, household_id: "someone-else" }));

    expect(mock.queryFor("expenses")?.values).not.toHaveProperty("household_id");
  });

  it("refuses an edit aimed at something that is not a row id", async () => {
    const state = await updateExpense(IDLE_STATE, formOf({ ...edit, id: "not-a-uuid" }));

    expect(state).toMatchObject({ status: "error", message: content.validation.formInvalid });
    expect(mock.queries).toHaveLength(0);
  });

  it("returns field messages instead of writing when the form is invalid", async () => {
    const state = await updateExpense(IDLE_STATE, formOf({ ...edit, amount: "0" }));

    expect(state).toMatchObject({
      fieldErrors: { amount: content.validation.amountPositive },
    });
    expect(mock.queries).toHaveLength(0);
  });

  it("reports a database rejection without losing the form", async () => {
    mock = createSupabaseMock({ error: postgrestError() });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);

    const state = await updateExpense(IDLE_STATE, formOf(edit));

    expect(state).toMatchObject({ status: "error", message: content.common.genericError });
  });
});

describe("createExpense", () => {
  it("inserts the expense under the household from the session", async () => {
    const state = await createExpense(IDLE_STATE, formOf(validExpense));

    expect(state).toEqual({ status: "success", message: content.expenses.created });
    expect(mock.queryFor("expenses")).toMatchObject({
      operation: "insert",
      values: {
        household_id: "household-1",
        description: "Recibo del agua",
        amount: 80_000,
        shared: true,
        notes: null,
      },
    });
  });

  it("ignores a household id smuggled in through the form", async () => {
    await createExpense(IDLE_STATE, formOf({ ...validExpense, household_id: "someone-else" }));

    expect(mock.queryFor("expenses")?.values).toMatchObject({ household_id: "household-1" });
  });

  it("returns field messages instead of writing when the form is invalid", async () => {
    const state = await createExpense(IDLE_STATE, formOf({ ...validExpense, amount: "0" }));

    expect(state).toMatchObject({
      status: "error",
      message: content.validation.formInvalid,
      fieldErrors: { amount: content.validation.amountPositive },
    });
    expect(mock.queries).toHaveLength(0);
  });

  it("reports a database rejection without losing the form", async () => {
    mock = createSupabaseMock({ error: postgrestError() });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);

    const state = await createExpense(IDLE_STATE, formOf(validExpense));

    expect(state).toMatchObject({ status: "error", message: content.common.genericError });
  });
});

describe("deleteExpense", () => {
  it("deletes the row by id", async () => {
    const state = await deleteExpense(IDLE_STATE, formOf({ id: ROW }));

    expect(state).toEqual({ status: "success", message: content.expenses.deleted });
    expect(mock.queryFor("expenses")).toMatchObject({
      operation: "delete",
      filters: [["id", ROW]],
    });
  });

  it("refuses an id that is not a real reference", async () => {
    const state = await deleteExpense(IDLE_STATE, formOf({ id: "nope" }));

    expect(state).toMatchObject({ status: "error" });
    expect(mock.queries).toHaveLength(0);
  });
});

describe("setExpenseActive", () => {
  it("switches an expense out of the calculations without deleting it", async () => {
    const state = await setExpenseActive(IDLE_STATE, formOf({ id: ROW, active: "false" }));

    expect(state).toEqual({ status: "success", message: content.expenses.disabled });
    expect(mock.queryFor("expenses")).toMatchObject({
      operation: "update",
      values: { active: false },
      filters: [["id", ROW]],
    });
  });

  it("switches it back on", async () => {
    const state = await setExpenseActive(IDLE_STATE, formOf({ id: ROW, active: "true" }));

    expect(state).toEqual({ status: "success", message: content.expenses.enabled });
    expect(mock.queryFor("expenses")?.values).toMatchObject({ active: true });
  });

  it("never deletes the row", async () => {
    await setExpenseActive(IDLE_STATE, formOf({ id: ROW, active: "false" }));

    expect(mock.queryFor("expenses")?.operation).not.toBe("delete");
  });

  it("refuses a request that does not say which state it wants", async () => {
    const state = await setExpenseActive(IDLE_STATE, formOf({ id: ROW }));

    expect(state).toMatchObject({ status: "error" });
    expect(mock.queries).toHaveLength(0);
  });
});

describe("createIncome", () => {
  const validIncome = {
    label: "Nómina",
    amount: "4.500.000",
    occurred_on: "2026-09-01",
    user_id: USER,
    payment_method_id: METHOD,
  };

  it("inserts the income under the session's household", async () => {
    const state = await createIncome(IDLE_STATE, formOf(validIncome));

    expect(state).toEqual({ status: "success", message: content.income.created });
    expect(mock.queryFor("incomes")).toMatchObject({
      operation: "insert",
      values: { household_id: "household-1", amount: 4_500_000 },
    });
  });

  it("rejects an income with no concept", async () => {
    const state = await createIncome(IDLE_STATE, formOf({ ...validIncome, label: "" }));

    expect(state).toMatchObject({ status: "error" });
  });
});

describe("deleteIncome", () => {
  it("deletes the row by id", async () => {
    await deleteIncome(IDLE_STATE, formOf({ id: ROW }));

    expect(mock.queryFor("incomes")).toMatchObject({
      operation: "delete",
      filters: [["id", ROW]],
    });
  });

  it("refuses a malformed id", async () => {
    expect(await deleteIncome(IDLE_STATE, formOf({ id: "" }))).toMatchObject({ status: "error" });
  });
});

describe("createTransfer", () => {
  const validTransfer = {
    from_payment_method_id: METHOD,
    to_payment_method_id: OTHER_METHOD,
    amount: "370.000",
    occurred_on: "2026-09-20",
    user_id: USER,
  };

  it("records the transfer without touching the expenses table", async () => {
    const state = await createTransfer(IDLE_STATE, formOf(validTransfer));

    expect(state).toEqual({ status: "success", message: content.transfers.created });
    expect(mock.queryFor("transfers")).toMatchObject({ operation: "insert" });
    expect(mock.queryFor("expenses")).toBeUndefined();
  });

  it("refuses a transfer from an account to itself", async () => {
    const state = await createTransfer(
      IDLE_STATE,
      formOf({ ...validTransfer, to_payment_method_id: METHOD }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { to_payment_method_id: content.validation.sameAccount },
    });
    expect(mock.queries).toHaveLength(0);
  });
});

describe("deleteTransfer", () => {
  it("deletes the row by id", async () => {
    await deleteTransfer(IDLE_STATE, formOf({ id: ROW }));

    expect(mock.queryFor("transfers")).toMatchObject({
      operation: "delete",
      filters: [["id", ROW]],
    });
  });

  it("refuses a malformed id", async () => {
    expect(await deleteTransfer(IDLE_STATE, formOf({ id: "x" }))).toMatchObject({
      status: "error",
    });
  });
});

describe("receiveExpectedIncome", () => {
  const source = makeIncomeTemplateItem({
    id: ROW,
    user_id: USER,
    label: "Nómina",
    amount: 4_500_000,
    starts_on: "2020-01-01",
    payment_method_id: METHOD,
  });

  const useTables = (tables: Record<string, unknown[]>) => {
    mock = createSupabaseMock({ tables });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);
  };

  const receive = (month: string) =>
    receiveExpectedIncome(IDLE_STATE, formOf({ month, template_item_id: ROW }));

  it("records the expected income with its amount, person and account, dated today", async () => {
    useTables({ income_template_items: [source] });
    const today = new Date();
    const month = formatIsoDate(today).slice(0, 7);

    const state = await receive(month);

    expect(state).toEqual({ status: "success", message: content.income.receivedSaved });
    expect(mock.queryFor("incomes")).toMatchObject({
      operation: "insert",
      values: {
        household_id: "household-1",
        user_id: USER,
        label: "Nómina",
        amount: 4_500_000,
        payment_method_id: METHOD,
        occurred_on: formatIsoDate(today),
        template_item_id: ROW,
      },
    });
  });

  it("dates a past month's income on that month's last day", async () => {
    useTables({ income_template_items: [source] });

    await receive("2025-02");

    expect(mock.queryFor("incomes")?.values).toMatchObject({ occurred_on: "2025-02-28" });
  });

  it("looks for an earlier receipt only within that month", async () => {
    useTables({ income_template_items: [source] });

    await receive("2025-02");

    const receiptLookup = mock.queries.find(
      (query) => query.table === "incomes" && query.operation === "select",
    );
    expect(receiptLookup?.filters).toEqual([
      ["template_item_id", ROW],
      ["occurred_on", "2025-02-01"],
      ["occurred_on", "2025-02-28"],
    ]);
  });

  it("refuses a month that has not arrived yet", async () => {
    const state = await receive("2999-01");

    expect(state).toMatchObject({ status: "error", message: content.income.futureMonth });
    expect(mock.queries).toHaveLength(0);
  });

  it("records a source only once per month", async () => {
    useTables({
      income_template_items: [source],
      incomes: [makeIncome({ template_item_id: ROW })],
    });

    const state = await receive("2025-02");

    expect(state).toMatchObject({ status: "error", message: content.income.alreadyReceived });
    expect(mock.queries.some((query) => query.operation === "insert")).toBe(false);
  });

  it("refuses a source that is not expected that month", async () => {
    useTables({ income_template_items: [{ ...source, starts_on: "2025-06-01" }] });

    const state = await receive("2025-02");

    expect(state).toMatchObject({ status: "error", message: content.income.notExpected });
  });

  it("refuses a source expected to bring nothing", async () => {
    useTables({ income_template_items: [{ ...source, amount: 0 }] });

    const state = await receive("2025-02");

    expect(state).toMatchObject({ status: "error", message: content.income.notExpected });
    expect(mock.queries.some((query) => query.operation === "insert")).toBe(false);
  });

  it("rejects a malformed request before reading anything", async () => {
    const state = await receiveExpectedIncome(
      IDLE_STATE,
      formOf({ month: "septiembre", template_item_id: ROW }),
    );

    expect(state).toMatchObject({ status: "error" });
    expect(mock.queries).toHaveLength(0);
  });
});
