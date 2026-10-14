"use server";

import { z } from "zod";

import { content } from "@/content/es";
import { mutate } from "@/lib/actions/mutate";
import { errorState, parseForm, type ActionState } from "@/lib/actions/state";
import { resolveExpectedIncome } from "@/lib/calculations/income";
import { rowsOf } from "@/lib/data/query";
import {
  currentMonthKey,
  formatIsoDate,
  monthEndIsoDate,
  monthKeyToIsoDate,
} from "@/lib/dates/month";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { idField } from "@/schemas/fields";
import { incomeReceiptSchema } from "@/schemas/plan";
import {
  expenseActiveSchema,
  expenseInputSchema,
  expenseUpdateSchema,
  incomeInputSchema,
  transferInputSchema,
} from "@/schemas/transactions";

const deleteSchema = z.object({ id: idField });

export async function createExpense(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(expenseInputSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async ({ household }, supabase) =>
      (await supabase.from("expenses").insert({ ...parsed.data, household_id: household.id }))
        .error,
    content.expenses.created,
    formData,
  );
}

/**
 * Edits an expense in place.
 *
 * The id travels in the form, but the household does not: `mutate` resolves
 * that from the session and Row Level Security refuses the write outright if
 * the row belongs to someone else.
 */
export async function updateExpense(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(expenseUpdateSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  const { id, ...values } = parsed.data;

  return mutate(
    async (_context, supabase) =>
      (await supabase.from("expenses").update(values).eq("id", id)).error,
    content.expenses.updated,
    formData,
  );
}

export async function deleteExpense(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(deleteSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async (_context, supabase) =>
      (await supabase.from("expenses").delete().eq("id", parsed.data.id)).error,
    content.expenses.deleted,
    formData,
  );
}

/**
 * Switches an expense in or out of every calculation without deleting it.
 */
export async function setExpenseActive(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(expenseActiveSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async (_context, supabase) =>
      (
        await supabase
          .from("expenses")
          .update({ active: parsed.data.active })
          .eq("id", parsed.data.id)
      ).error,
    parsed.data.active ? content.expenses.enabled : content.expenses.disabled,
    formData,
  );
}

export async function createIncome(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(incomeInputSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async ({ household }, supabase) =>
      (await supabase.from("incomes").insert({ ...parsed.data, household_id: household.id })).error,
    content.income.created,
    formData,
  );
}

/**
 * Records an expected income as received.
 *
 * The plan says what should arrive; only a recorded income says it did. This
 * turns one into the other in a click, copying the amount expected that month,
 * the person and the account from the source, and naming the source so the
 * month shows it as received exactly once. Everything is resolved on the server
 * from the source itself — the form carries only which source and which month.
 *
 * Dated today in the current month, or on the last day of a past one. A future
 * month cannot be received yet.
 */
export async function receiveExpectedIncome(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(incomeReceiptSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  const { month, template_item_id: templateItemId } = parsed.data;
  const today = new Date();
  const currentMonth = currentMonthKey(today);

  if (month > currentMonth) {
    return errorState(content.income.futureMonth);
  }

  // Row Level Security scopes every read: a source from another household is
  // simply not expected, and nothing is written.
  const supabase = await createServerSupabaseClient();
  const [items, amounts, overrides, receipts] = await Promise.all([
    rowsOf("load income source", () =>
      supabase.from("income_template_items").select("*").eq("id", templateItemId),
    ),
    rowsOf("load income amounts", () =>
      supabase.from("income_template_amounts").select("*").eq("template_item_id", templateItemId),
    ),
    rowsOf("load income overrides", () =>
      supabase.from("income_month_overrides").select("*").eq("template_item_id", templateItemId),
    ),
    rowsOf("load income receipts", () =>
      supabase
        .from("incomes")
        .select("*")
        .eq("template_item_id", templateItemId)
        .gte("occurred_on", monthKeyToIsoDate(month))
        .lte("occurred_on", monthEndIsoDate(month)),
    ),
  ]);

  if (receipts.length > 0) {
    return errorState(content.income.alreadyReceived);
  }

  const expected = resolveExpectedIncome(items, amounts, overrides, month).at(0);
  // An income of nothing is not an income; the table refuses one anyway.
  if (expected === undefined || expected.amount === 0) {
    return errorState(content.income.notExpected);
  }

  return mutate(
    async ({ household }, client) =>
      (
        await client.from("incomes").insert({
          household_id: household.id,
          user_id: expected.userId,
          label: expected.label,
          amount: expected.amount,
          payment_method_id: expected.paymentMethodId,
          occurred_on: month === currentMonth ? formatIsoDate(today) : monthEndIsoDate(month),
          template_item_id: expected.templateItemId,
        })
      ).error,
    content.income.receivedSaved,
    formData,
  );
}

export async function deleteIncome(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(deleteSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async (_context, supabase) =>
      (await supabase.from("incomes").delete().eq("id", parsed.data.id)).error,
    content.income.deleted,
    formData,
  );
}

/**
 * A transfer moves money between payment methods. It is deliberately not an
 * expense: paying off a credit card or reimbursing a partner must never show up
 * in the month's spending.
 */
export async function createTransfer(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(transferInputSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async ({ household }, supabase) =>
      (await supabase.from("transfers").insert({ ...parsed.data, household_id: household.id }))
        .error,
    content.transfers.created,
    formData,
  );
}

export async function deleteTransfer(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(deleteSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async (_context, supabase) =>
      (await supabase.from("transfers").delete().eq("id", parsed.data.id)).error,
    content.transfers.deleted,
    formData,
  );
}
