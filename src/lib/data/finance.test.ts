import { describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { makeCategory, makeExpense, makeIncome, makeTransfer } from "@/test/factories";
import { createSupabaseMock, postgrestError } from "@/test/supabase-mock";

import {
  loadDashboardData,
  loadIncomePageData,
  loadMovementsData,
  loadPlanData,
  loadSettingsData,
} from "./finance";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

function mockSupabase(options?: Parameters<typeof createSupabaseMock>[0]) {
  const mock = createSupabaseMock(options);
  vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);
  return mock;
}

const tablesOf = (mock: ReturnType<typeof createSupabaseMock>) =>
  mock.queries.map((query) => query.table).sort();

describe("loadDashboardData", () => {
  it("loads every table the dashboard needs", async () => {
    const mock = mockSupabase({
      tables: {
        categories: [makeCategory()],
        expenses: [makeExpense()],
        incomes: [makeIncome()],
        transfers: [makeTransfer()],
      },
    });

    const data = await loadDashboardData("2026-09");

    expect(tablesOf(mock)).toEqual([
      "budget_month_overrides",
      "budget_template_items",
      "categories",
      "expenses",
      "income_month_overrides",
      "income_template_amounts",
      "income_template_items",
      "incomes",
      "payment_methods",
      "transfers",
    ]);
    expect(data.categories).toHaveLength(1);
    expect(data.expenses).toHaveLength(1);
    expect(data.incomes).toHaveLength(1);
    expect(data.transfers).toHaveLength(1);
    expect(data.paymentMethods).toEqual([]);
    expect(data.budgetTemplate).toEqual([]);
    expect(data.budgetOverrides).toEqual([]);
    expect(data.incomeTemplate).toEqual([]);
    expect(data.incomeTemplateAmounts).toEqual([]);
    expect(data.incomeOverrides).toEqual([]);
  });

  it("stops transactions at the end of the selected month", async () => {
    const mock = mockSupabase();

    await loadDashboardData("2026-09");

    // Browsing back to September must not show a card paid off in October.
    for (const table of ["expenses", "incomes", "transfers"]) {
      expect(mock.queryFor(table)?.filters).toEqual([["occurred_on", "2026-09-30"]]);
    }
  });

  it("uses the real last day of a short month", async () => {
    const mock = mockSupabase();

    await loadDashboardData("2026-02");

    expect(mock.queryFor("expenses")?.filters).toEqual([["occurred_on", "2026-02-28"]]);
  });

  it("surfaces a database failure rather than rendering a partial dashboard", async () => {
    mockSupabase({ error: postgrestError() });

    await expect(loadDashboardData("2026-09")).rejects.toThrow(
      "load categories: permission denied",
    );
  });
});

describe("loadMovementsData", () => {
  it("loads only the tables the movements list shows", async () => {
    const mock = mockSupabase({
      tables: { expenses: [makeExpense()], transfers: [makeTransfer()] },
    });

    const data = await loadMovementsData("2026-09");

    expect(tablesOf(mock)).toEqual(["categories", "expenses", "payment_methods", "transfers"]);
    expect(data.expenses).toHaveLength(1);
    expect(data.transfers).toHaveLength(1);
    expect(data.categories).toEqual([]);
    expect(data.paymentMethods).toEqual([]);
    expect(mock.queryFor("expenses")?.filters).toEqual([["occurred_on", "2026-09-30"]]);
  });

  it("surfaces a database failure", async () => {
    mockSupabase({ error: postgrestError() });

    await expect(loadMovementsData("2026-09")).rejects.toThrow(
      "load categories: permission denied",
    );
  });
});

describe("loadIncomePageData", () => {
  it("loads what arrived and what was expected, and no expenses", async () => {
    const mock = mockSupabase({ tables: { incomes: [makeIncome()] } });

    const data = await loadIncomePageData("2026-09");

    expect(tablesOf(mock)).toEqual([
      "income_month_overrides",
      "income_template_amounts",
      "income_template_items",
      "incomes",
      "payment_methods",
    ]);
    expect(data.incomes).toHaveLength(1);
    expect(data.paymentMethods).toEqual([]);
    expect(data.incomeTemplate).toEqual([]);
    expect(data.incomeOverrides).toEqual([]);
    expect(mock.queryFor("incomes")?.filters).toEqual([["occurred_on", "2026-09-30"]]);
  });

  it("surfaces a database failure", async () => {
    mockSupabase({ error: postgrestError() });

    await expect(loadIncomePageData("2026-09")).rejects.toThrow(
      "load payment methods: permission denied",
    );
  });
});

describe("loadPlanData", () => {
  it("loads templates, overrides and the expenses that can plan themselves", async () => {
    const mock = mockSupabase({
      tables: { categories: [makeCategory()], expenses: [makeExpense({ repeat_months: 1 })] },
    });

    const data = await loadPlanData("2026-09");

    expect(tablesOf(mock)).toEqual([
      "budget_month_overrides",
      "budget_template_items",
      "categories",
      "expenses",
      "income_month_overrides",
      "income_template_amounts",
      "income_template_items",
    ]);
    expect(data.categories).toHaveLength(1);
    expect(data.expenses).toHaveLength(1);
    // Nothing dated after the month can plan it.
    expect(mock.queryFor("expenses")?.filters).toEqual([["occurred_on", "2026-09-30"]]);
    expect(data.budgetTemplate).toEqual([]);
    expect(data.budgetOverrides).toEqual([]);
    expect(data.incomeTemplate).toEqual([]);
    expect(data.incomeOverrides).toEqual([]);
  });

  it("surfaces a database failure", async () => {
    mockSupabase({ error: postgrestError() });

    await expect(loadPlanData("2026-09")).rejects.toThrow("load categories: permission denied");
  });
});

describe("loadSettingsData", () => {
  it("loads the household's reference data only", async () => {
    const mock = mockSupabase({ tables: { categories: [makeCategory()] } });

    const data = await loadSettingsData();

    expect(tablesOf(mock)).toEqual([
      "categories",
      "income_template_amounts",
      "income_template_items",
      "payment_methods",
    ]);
    expect(data.categories).toHaveLength(1);
    expect(data.paymentMethods).toEqual([]);
    expect(data.incomeTemplate).toEqual([]);
  });

  it("surfaces a database failure", async () => {
    mockSupabase({ error: postgrestError() });

    await expect(loadSettingsData()).rejects.toThrow("load categories: permission denied");
  });
});

describe("every loader", () => {
  it("never filters by household, leaving that to Row Level Security", async () => {
    for (const load of [
      () => loadDashboardData("2026-09"),
      () => loadMovementsData("2026-09"),
      () => loadIncomePageData("2026-09"),
      () => loadPlanData("2026-09"),
      loadSettingsData,
    ]) {
      const mock = mockSupabase();

      await load();

      const householdFilters = mock.queries
        .flatMap((query) => query.filters)
        .filter(([column]) => column === "household_id");

      expect(householdFilters).toEqual([]);
    }
  });
});
