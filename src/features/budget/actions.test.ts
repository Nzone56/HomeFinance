import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { IDLE_STATE } from "@/lib/actions/state";
import { requireHouseholdContext } from "@/lib/data/household";
import { currentMonthKey, monthKeyToIsoDate } from "@/lib/dates/month";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";

import {
  resetBudgetMonthOverride,
  resetIncomeMonthOverride,
  saveBudgetMonthOverride,
  saveBudgetTemplateItem,
  saveIncomeMonthOverride,
  saveIncomeTemplateAmount,
} from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/household", () => ({ requireHouseholdContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

const CATEGORY = "11111111-1111-4111-8111-111111111111";
const ITEM = "22222222-2222-4222-8222-222222222222";

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
    userId: "user-julian",
    household: { id: "household-1", name: "Nuestra casa", created_at: "2026-01-01" },
    members: [],
  });
  vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);
});

describe("saveBudgetTemplateItem", () => {
  it("writes the template from the current month on, leaving earlier months alone", async () => {
    const state = await saveBudgetTemplateItem(
      IDLE_STATE,
      formOf({ category_id: CATEGORY, amount: "1.500.000" }),
    );

    expect(state).toEqual({ status: "success", message: content.budget.templateSaved });
    expect(mock.queryFor("budget_template_items")).toMatchObject({
      operation: "upsert",
      values: {
        household_id: "household-1",
        category_id: CATEGORY,
        amount: 1_500_000,
        effective_from: monthKeyToIsoDate(currentMonthKey(new Date())),
      },
      // Saving twice in a month replaces that month's version instead of stacking.
      upsertOptions: { onConflict: "household_id,category_id,effective_from" },
    });
  });

  it("never writes a month override", async () => {
    await saveBudgetTemplateItem(IDLE_STATE, formOf({ category_id: CATEGORY, amount: "100" }));

    expect(mock.queryFor("budget_month_overrides")).toBeUndefined();
  });

  it("rejects an unreadable amount", async () => {
    const state = await saveBudgetTemplateItem(
      IDLE_STATE,
      formOf({ category_id: CATEGORY, amount: "" }),
    );

    expect(state).toMatchObject({ status: "error" });
    expect(mock.queries).toHaveLength(0);
  });
});

describe("saveBudgetMonthOverride", () => {
  it("stores the month as the first day, the way the column expects", async () => {
    const state = await saveBudgetMonthOverride(
      IDLE_STATE,
      formOf({ month: "2026-09", category_id: CATEGORY, amount: "950.000" }),
    );

    expect(state).toEqual({ status: "success", message: content.budget.monthSaved });
    expect(mock.queryFor("budget_month_overrides")).toMatchObject({
      operation: "upsert",
      values: {
        household_id: "household-1",
        month: "2026-09-01",
        category_id: CATEGORY,
        amount: 950_000,
      },
      upsertOptions: { onConflict: "household_id,month,category_id" },
    });
  });

  it("leaves the global template untouched", async () => {
    await saveBudgetMonthOverride(
      IDLE_STATE,
      formOf({ month: "2026-09", category_id: CATEGORY, amount: "1" }),
    );

    expect(mock.queryFor("budget_template_items")).toBeUndefined();
  });

  it("rejects a month that is not a month key", async () => {
    const state = await saveBudgetMonthOverride(
      IDLE_STATE,
      formOf({ month: "septiembre", category_id: CATEGORY, amount: "1" }),
    );

    expect(state).toMatchObject({ status: "error" });
  });
});

describe("resetBudgetMonthOverride", () => {
  it("deletes the override so the month follows the template again", async () => {
    const state = await resetBudgetMonthOverride(
      IDLE_STATE,
      formOf({ month: "2026-09", category_id: CATEGORY }),
    );

    expect(state).toEqual({ status: "success", message: content.budget.resetDone });
    expect(mock.queryFor("budget_month_overrides")).toMatchObject({
      operation: "delete",
      filters: [
        ["month", "2026-09-01"],
        ["category_id", CATEGORY],
      ],
    });
  });

  it("rejects a malformed request", async () => {
    expect(
      await resetBudgetMonthOverride(IDLE_STATE, formOf({ month: "2026-09", category_id: "x" })),
    ).toMatchObject({ status: "error" });
  });
});

describe("saveIncomeTemplateAmount", () => {
  it("corrects the starting amount of a source that starts this month", async () => {
    mock = createSupabaseMock({
      tables: {
        income_template_items: [{ starts_on: monthKeyToIsoDate(currentMonthKey(new Date())) }],
      },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);

    const state = await saveIncomeTemplateAmount(
      IDLE_STATE,
      formOf({ template_item_id: ITEM, amount: "3.500.000" }),
    );

    expect(state).toEqual({ status: "success", message: content.budget.templateSaved });
    expect(mock.queryFor("income_template_items")).toMatchObject({
      operation: "update",
      values: { amount: 3_500_000 },
      filters: [["id", ITEM]],
    });
    expect(mock.queryFor("income_template_amounts")).toBeUndefined();
  });

  it("records a change from this month for a source that started earlier", async () => {
    mock = createSupabaseMock({
      tables: { income_template_items: [{ starts_on: "2020-01-01" }] },
    });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);

    await saveIncomeTemplateAmount(
      IDLE_STATE,
      formOf({ template_item_id: ITEM, amount: "5000000" }),
    );

    expect(mock.queryFor("income_template_amounts")).toMatchObject({
      operation: "upsert",
      values: {
        household_id: "household-1",
        template_item_id: ITEM,
        effective_from: monthKeyToIsoDate(currentMonthKey(new Date())),
        amount: 5_000_000,
      },
    });
  });

  it("rejects a negative amount instead of silently dropping the sign", async () => {
    expect(
      await saveIncomeTemplateAmount(IDLE_STATE, formOf({ template_item_id: ITEM, amount: "-5" })),
    ).toMatchObject({ status: "error" });
  });
});

describe("saveIncomeMonthOverride", () => {
  it("stores the month as the first day", async () => {
    const state = await saveIncomeMonthOverride(
      IDLE_STATE,
      formOf({ month: "2026-09", template_item_id: ITEM, amount: "2.900.000" }),
    );

    expect(state).toEqual({ status: "success", message: content.budget.monthSaved });
    expect(mock.queryFor("income_month_overrides")).toMatchObject({
      operation: "upsert",
      values: { month: "2026-09-01", template_item_id: ITEM, amount: 2_900_000 },
      upsertOptions: { onConflict: "household_id,month,template_item_id" },
    });
  });
  it("rejects an override with an unreadable amount", async () => {
    const state = await saveIncomeMonthOverride(
      IDLE_STATE,
      formOf({ month: "2026-09", template_item_id: ITEM, amount: "abc" }),
    );

    expect(state).toMatchObject({ status: "error" });
    expect(mock.queries).toHaveLength(0);
  });
});

describe("resetIncomeMonthOverride", () => {
  it("deletes the override", async () => {
    const state = await resetIncomeMonthOverride(
      IDLE_STATE,
      formOf({ month: "2026-09", template_item_id: ITEM }),
    );

    expect(state).toEqual({ status: "success", message: content.budget.resetDone });
    expect(mock.queryFor("income_month_overrides")).toMatchObject({
      operation: "delete",
      filters: [
        ["month", "2026-09-01"],
        ["template_item_id", ITEM],
      ],
    });
  });

  it("rejects a malformed request", async () => {
    expect(
      await resetIncomeMonthOverride(IDLE_STATE, formOf({ month: "x", template_item_id: ITEM })),
    ).toMatchObject({ status: "error" });
  });
});
