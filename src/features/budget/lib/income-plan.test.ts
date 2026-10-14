import { describe, expect, it } from "vitest";

import { createSupabaseMock, postgrestError } from "@/test/supabase-mock";

import { isCreditCard, writeIncomeBaseline } from "./income-plan";

const ITEM = "22222222-2222-4222-8222-222222222222";
const METHOD = "33333333-3333-4333-8333-333333333333";

describe("writeIncomeBaseline", () => {
  it("corrects the starting amount of a source that starts in that month", async () => {
    const mock = createSupabaseMock({
      tables: { income_template_items: [{ starts_on: "2026-09-01" }] },
    });

    const error = await writeIncomeBaseline(mock.client, "household-1", ITEM, 5_000, "2026-09");

    expect(error).toBeNull();
    expect(mock.queryFor("income_template_items")).toMatchObject({
      operation: "update",
      values: { amount: 5_000 },
      filters: [["id", ITEM]],
    });
    expect(mock.queryFor("income_template_amounts")).toBeUndefined();
  });

  it("records a dated change for a source that started earlier, so past months keep theirs", async () => {
    const mock = createSupabaseMock({
      tables: { income_template_items: [{ starts_on: "2026-06-01" }] },
    });

    await writeIncomeBaseline(mock.client, "household-1", ITEM, 5_000, "2026-09");

    expect(mock.queryFor("income_template_amounts")).toMatchObject({
      operation: "upsert",
      values: {
        household_id: "household-1",
        template_item_id: ITEM,
        effective_from: "2026-09-01",
        amount: 5_000,
      },
      upsertOptions: { onConflict: "household_id,template_item_id,effective_from" },
    });
    // The amount the source started with is left as it was.
    expect(
      mock.queries.some(
        (query) => query.table === "income_template_items" && query.operation === "update",
      ),
    ).toBe(false);
  });

  it("writes nothing into history for a source it cannot see", async () => {
    // Row Level Security hides another household's source; the update then
    // touches no rows.
    const mock = createSupabaseMock();

    await writeIncomeBaseline(mock.client, "household-1", ITEM, 5_000, "2026-09");

    expect(mock.queryFor("income_template_amounts")).toBeUndefined();
    expect(mock.queryFor("income_template_items")?.operation).toBe("update");
  });

  it("returns a failure to read the source instead of guessing", async () => {
    const mock = createSupabaseMock({ error: postgrestError() });

    const error = await writeIncomeBaseline(mock.client, "household-1", ITEM, 5_000, "2026-09");

    expect(error?.message).toBe("permission denied");
    expect(mock.queries).toHaveLength(1);
  });
});

describe("isCreditCard", () => {
  it("is false without asking when there is no account at all", async () => {
    const mock = createSupabaseMock();

    expect(await isCreditCard(mock.client, null)).toBe(false);
    expect(mock.queries).toHaveLength(0);
  });

  it("recognises a credit card", async () => {
    const mock = createSupabaseMock({ tables: { payment_methods: [{ type: "credit_card" }] } });

    expect(await isCreditCard(mock.client, METHOD)).toBe(true);
  });

  it("lets a bank account through", async () => {
    const mock = createSupabaseMock({ tables: { payment_methods: [{ type: "bank_account" }] } });

    expect(await isCreditCard(mock.client, METHOD)).toBe(false);
  });

  it("is false for a method it cannot find", async () => {
    expect(await isCreditCard(createSupabaseMock().client, METHOD)).toBe(false);
  });
});
