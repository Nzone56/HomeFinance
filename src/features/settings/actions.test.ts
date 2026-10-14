import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { IDLE_STATE } from "@/lib/actions/state";
import { requireHouseholdContext } from "@/lib/data/household";
import { currentMonthKey, monthKeyToIsoDate } from "@/lib/dates/month";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseMock, postgrestError, type SupabaseMock } from "@/test/supabase-mock";

import {
  saveCategory,
  saveHousehold,
  saveIncomeSource,
  savePaymentMethod,
  saveProfile,
} from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/household", () => ({ requireHouseholdContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

const USER = "44444444-4444-4444-8444-444444444444";
const EXISTING = "55555555-5555-4555-8555-555555555555";

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

const bankAccount = {
  name: "Cuenta de nómina",
  type: "bank_account",
  user_id: USER,
  active: "on",
};

describe("savePaymentMethod", () => {
  it("inserts a new method under the session's household", async () => {
    const state = await savePaymentMethod(IDLE_STATE, formOf(bankAccount));

    expect(state).toEqual({ status: "success", message: content.settings.methodSaved });
    expect(mock.queryFor("payment_methods")).toMatchObject({
      operation: "insert",
      values: { household_id: "household-1", name: "Cuenta de nómina", credit_limit: null },
    });
  });

  it("updates in place when an id is supplied", async () => {
    await savePaymentMethod(IDLE_STATE, formOf({ ...bankAccount, id: EXISTING }));

    expect(mock.queryFor("payment_methods")).toMatchObject({
      operation: "update",
      filters: [["id", EXISTING]],
    });
  });

  it("does not let an update reassign the household", async () => {
    await savePaymentMethod(IDLE_STATE, formOf({ ...bankAccount, id: EXISTING }));

    expect(mock.queryFor("payment_methods")?.values).not.toHaveProperty("household_id");
  });

  it("stores a credit card with its cycle", async () => {
    await savePaymentMethod(
      IDLE_STATE,
      formOf({
        name: "TC1",
        type: "credit_card",
        user_id: USER,
        active: "on",
        credit_limit: "5.000.000",
        closing_day: "15",
        due_day: "5",
      }),
    );

    expect(mock.queryFor("payment_methods")?.values).toMatchObject({
      credit_limit: 5_000_000,
      closing_day: 15,
      due_day: 5,
    });
  });

  it("stores the debt a card already carried", async () => {
    await savePaymentMethod(
      IDLE_STATE,
      formOf({
        name: "TC1",
        type: "credit_card",
        user_id: USER,
        active: "on",
        credit_limit: "12.000.000",
        closing_day: "13",
        due_day: "3",
        opening_debt: "808.307",
      }),
    );

    expect(mock.queryFor("payment_methods")?.values).toMatchObject({ opening_debt: 808_307 });
  });

  it("refuses a credit card with no cycle", async () => {
    const state = await savePaymentMethod(
      IDLE_STATE,
      formOf({ name: "TC1", type: "credit_card", user_id: USER, active: "on" }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { credit_limit: content.validation.creditCardFieldsRequired },
    });
    expect(mock.queries).toHaveLength(0);
  });

  it("refuses a malformed id rather than writing to the wrong row", async () => {
    const state = await savePaymentMethod(IDLE_STATE, formOf({ ...bankAccount, id: "nope" }));

    expect(state).toMatchObject({ status: "error" });
    expect(mock.queries).toHaveLength(0);
  });
});

describe("saveCategory", () => {
  it("inserts a new category", async () => {
    const state = await saveCategory(
      IDLE_STATE,
      formOf({ name: "Mascotas", sort_order: "100", archived: "" }),
    );

    expect(state).toEqual({ status: "success", message: content.settings.categorySaved });
    expect(mock.queryFor("categories")).toMatchObject({
      operation: "insert",
      values: { household_id: "household-1", name: "Mascotas", sort_order: 100, archived: false },
    });
  });

  it("archives an existing category instead of deleting it", async () => {
    await saveCategory(
      IDLE_STATE,
      formOf({ id: EXISTING, name: "Viejo", sort_order: "10", archived: "on" }),
    );

    expect(mock.queryFor("categories")).toMatchObject({
      operation: "update",
      values: { archived: true },
      filters: [["id", EXISTING]],
    });
  });

  it("refuses an empty name", async () => {
    expect(await saveCategory(IDLE_STATE, formOf({ name: "", sort_order: "0" }))).toMatchObject({
      status: "error",
    });
  });

  it("refuses a malformed id rather than writing to the wrong row", async () => {
    const state = await saveCategory(
      IDLE_STATE,
      formOf({ id: "nope", name: "Mascotas", sort_order: "0" }),
    );

    expect(state).toMatchObject({ status: "error" });
    expect(mock.queries).toHaveLength(0);
  });
});

describe("saveIncomeSource", () => {
  const source = { user_id: USER, label: "Nómina", amount: "4.500.000", active: "on" };
  const METHOD = "66666666-6666-4666-8666-666666666666";

  const useTables = (tables: Record<string, unknown[]>) => {
    mock = createSupabaseMock({ tables });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);
  };

  it("inserts a new source, expected from the current month on", async () => {
    const state = await saveIncomeSource(IDLE_STATE, formOf(source));

    expect(state).toEqual({ status: "success", message: content.settings.incomeSourceSaved });
    expect(mock.queryFor("income_template_items")).toMatchObject({
      operation: "insert",
      values: {
        household_id: "household-1",
        label: "Nómina",
        amount: 4_500_000,
        active: true,
        payment_method_id: null,
        starts_on: monthKeyToIsoDate(currentMonthKey(new Date())),
      },
    });
  });

  it("stores the account the income lands in", async () => {
    useTables({ payment_methods: [{ type: "bank_account" }] });

    await saveIncomeSource(IDLE_STATE, formOf({ ...source, payment_method_id: METHOD }));

    expect(mock.queryFor("income_template_items")?.values).toMatchObject({
      payment_method_id: METHOD,
    });
  });

  it("refuses a credit card as the account, next to the field", async () => {
    useTables({ payment_methods: [{ type: "credit_card" }] });

    const state = await saveIncomeSource(
      IDLE_STATE,
      formOf({ ...source, payment_method_id: METHOD }),
    );

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: { payment_method_id: content.validation.incomeAccountNotCard },
    });
    expect(mock.queryFor("income_template_items")).toBeUndefined();
  });

  it("updates the details of an existing source outright", async () => {
    await saveIncomeSource(IDLE_STATE, formOf({ ...source, id: EXISTING }));

    const detailsUpdate = mock.queries.find(
      (query) => query.table === "income_template_items" && query.operation === "update",
    );
    expect(detailsUpdate).toMatchObject({ filters: [["id", EXISTING]] });
    expect(detailsUpdate?.values).toMatchObject({ label: "Nómina", active: true });
    expect(detailsUpdate?.values).not.toHaveProperty("amount");
  });

  it("changes an existing source's amount only from this month on", async () => {
    useTables({ income_template_items: [{ starts_on: "2020-01-01" }] });

    await saveIncomeSource(IDLE_STATE, formOf({ ...source, id: EXISTING }));

    expect(mock.queryFor("income_template_amounts")).toMatchObject({
      operation: "upsert",
      values: {
        template_item_id: EXISTING,
        amount: 4_500_000,
        effective_from: monthKeyToIsoDate(currentMonthKey(new Date())),
      },
    });
  });

  it("stops at a failed update rather than recording an amount change", async () => {
    mock = createSupabaseMock({ error: postgrestError() });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);

    const state = await saveIncomeSource(IDLE_STATE, formOf({ ...source, id: EXISTING }));

    expect(state).toMatchObject({ status: "error" });
    expect(mock.queryFor("income_template_amounts")).toBeUndefined();
  });

  it("refuses a malformed id", async () => {
    expect(await saveIncomeSource(IDLE_STATE, formOf({ ...source, id: "x" }))).toMatchObject({
      status: "error",
    });
  });

  it("refuses a source with no concept", async () => {
    const state = await saveIncomeSource(IDLE_STATE, formOf({ ...source, label: "" }));

    expect(state).toMatchObject({ status: "error" });
    expect(mock.queries).toHaveLength(0);
  });
});

describe("saveProfile", () => {
  it("renames only the signed-in user", async () => {
    const state = await saveProfile(IDLE_STATE, formOf({ display_name: "Julián" }));

    expect(state).toEqual({ status: "success", message: content.settings.profileSaved });
    expect(mock.queryFor("profiles")).toMatchObject({
      operation: "update",
      values: { display_name: "Julián" },
      // The id comes from the session, never from the form.
      filters: [["id", USER]],
    });
  });

  it("refuses an empty name", async () => {
    expect(await saveProfile(IDLE_STATE, formOf({ display_name: " " }))).toMatchObject({
      status: "error",
    });
  });
});

describe("saveHousehold", () => {
  it("renames the household the session belongs to", async () => {
    const state = await saveHousehold(IDLE_STATE, formOf({ name: "Casa nueva" }));

    expect(state).toEqual({ status: "success", message: content.settings.householdSaved });
    expect(mock.queryFor("households")).toMatchObject({
      operation: "update",
      values: { name: "Casa nueva" },
      filters: [["id", "household-1"]],
    });
  });

  it("refuses an empty name", async () => {
    expect(await saveHousehold(IDLE_STATE, formOf({ name: "" }))).toMatchObject({
      status: "error",
    });
  });
});
