"use server";

import { content } from "@/content/es";
import { mutate } from "@/lib/actions/mutate";
import { parseForm, type ActionState } from "@/lib/actions/state";
import { currentMonthKey, monthKeyToIsoDate } from "@/lib/dates/month";
import {
  budgetMonthOverrideSchema,
  budgetOverrideResetSchema,
  budgetTemplateItemSchema,
  incomeMonthOverrideSchema,
  incomeOverrideResetSchema,
  incomeTemplateAmountSchema,
} from "@/schemas/plan";

import { writeIncomeBaseline } from "./lib/income-plan";

/**
 * The template: the baseline months inherit, from the current month onward.
 *
 * Each save writes the version for this month, so earlier months keep the plan
 * they had — a September budget never reaches back into August. Saving twice in
 * the same month replaces this month's version rather than stacking another.
 */
export async function saveBudgetTemplateItem(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(budgetTemplateItemSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async ({ household }, supabase) =>
      (
        await supabase.from("budget_template_items").upsert(
          {
            ...parsed.data,
            household_id: household.id,
            effective_from: monthKeyToIsoDate(currentMonthKey(new Date())),
          },
          { onConflict: "household_id,category_id,effective_from" },
        )
      ).error,
    content.budget.templateSaved,
    formData,
  );
}

/**
 * A single month's departure from the template. Absence of a row means "follow
 * the template", so this only ever writes when a month genuinely differs.
 */
export async function saveBudgetMonthOverride(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(budgetMonthOverrideSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async ({ household }, supabase) =>
      (
        await supabase.from("budget_month_overrides").upsert(
          {
            household_id: household.id,
            month: monthKeyToIsoDate(parsed.data.month),
            category_id: parsed.data.category_id,
            amount: parsed.data.amount,
          },
          { onConflict: "household_id,month,category_id" },
        )
      ).error,
    content.budget.monthSaved,
    formData,
  );
}

export async function resetBudgetMonthOverride(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(budgetOverrideResetSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async (_context, supabase) =>
      (
        await supabase
          .from("budget_month_overrides")
          .delete()
          .eq("month", monthKeyToIsoDate(parsed.data.month))
          .eq("category_id", parsed.data.category_id)
      ).error,
    content.budget.resetDone,
    formData,
  );
}

export async function saveIncomeMonthOverride(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(incomeMonthOverrideSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async ({ household }, supabase) =>
      (
        await supabase.from("income_month_overrides").upsert(
          {
            household_id: household.id,
            month: monthKeyToIsoDate(parsed.data.month),
            template_item_id: parsed.data.template_item_id,
            amount: parsed.data.amount,
          },
          { onConflict: "household_id,month,template_item_id" },
        )
      ).error,
    content.budget.monthSaved,
    formData,
  );
}

export async function resetIncomeMonthOverride(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(incomeOverrideResetSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async (_context, supabase) =>
      (
        await supabase
          .from("income_month_overrides")
          .delete()
          .eq("month", monthKeyToIsoDate(parsed.data.month))
          .eq("template_item_id", parsed.data.template_item_id)
      ).error,
    content.budget.resetDone,
    formData,
  );
}

/** The baseline expectation for one income source, from the current month onward. */
export async function saveIncomeTemplateAmount(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(incomeTemplateAmountSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async ({ household }, supabase) =>
      writeIncomeBaseline(
        supabase,
        household.id,
        parsed.data.template_item_id,
        parsed.data.amount,
        currentMonthKey(new Date()),
      ),
    content.budget.templateSaved,
    formData,
  );
}
