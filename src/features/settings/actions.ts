"use server";

import { z } from "zod";

import { content } from "@/content/es";
import { isCreditCard, writeIncomeBaseline } from "@/features/budget/lib/income-plan";
import { mutate } from "@/lib/actions/mutate";
import { errorState, formValues, parseForm, type ActionState } from "@/lib/actions/state";
import { currentMonthKey, monthKeyToIsoDate } from "@/lib/dates/month";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { optionalIdField } from "@/schemas/fields";
import { incomeTemplateItemSchema } from "@/schemas/plan";
import {
  categoryInputSchema,
  householdInputSchema,
  paymentMethodInputSchema,
  profileInputSchema,
} from "@/schemas/settings";

/**
 * Reference data is never deleted, only deactivated or archived: expenses point
 * at it, and a household's history must stay readable.
 */
const optionalIdSchema = z.object({ id: optionalIdField });

export async function savePaymentMethod(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(paymentMethodInputSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }
  const identity = parseForm(optionalIdSchema, formData);
  if (!identity.ok) {
    return identity.state;
  }

  const existingId = identity.data.id;

  return mutate(
    async ({ household }, supabase) => {
      if (existingId !== null) {
        return (await supabase.from("payment_methods").update(parsed.data).eq("id", existingId))
          .error;
      }
      return (
        await supabase
          .from("payment_methods")
          .insert({ ...parsed.data, household_id: household.id })
      ).error;
    },
    content.settings.methodSaved,
    formData,
  );
}

export async function saveCategory(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(categoryInputSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }
  const identity = parseForm(optionalIdSchema, formData);
  if (!identity.ok) {
    return identity.state;
  }

  const existingId = identity.data.id;

  return mutate(
    async ({ household }, supabase) => {
      if (existingId !== null) {
        return (await supabase.from("categories").update(parsed.data).eq("id", existingId)).error;
      }
      return (
        await supabase.from("categories").insert({ ...parsed.data, household_id: household.id })
      ).error;
    },
    content.settings.categorySaved,
    formData,
  );
}

/**
 * An expected income source.
 *
 * A new source is expected from the current month onward, never before it. An
 * edit changes the name, the owner and the account outright, but the amount
 * only from this month on — see `writeIncomeBaseline`. The account can be a
 * bank account, cash or a benefits card; never a credit card.
 */
export async function saveIncomeSource(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(incomeTemplateItemSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }
  const identity = parseForm(optionalIdSchema, formData);
  if (!identity.ok) {
    return identity.state;
  }

  // Row Level Security scopes this read, so a method from another household
  // simply is not found and the write below is refused on its own.
  const reader = await createServerSupabaseClient();
  if (await isCreditCard(reader, parsed.data.payment_method_id)) {
    return errorState(
      content.validation.formInvalid,
      { payment_method_id: content.validation.incomeAccountNotCard },
      formValues(formData),
    );
  }

  const existingId = identity.data.id;
  const currentMonth = currentMonthKey(new Date());
  const { amount, ...details } = parsed.data;

  return mutate(
    async ({ household }, supabase) => {
      if (existingId === null) {
        return (
          await supabase.from("income_template_items").insert({
            ...parsed.data,
            household_id: household.id,
            starts_on: monthKeyToIsoDate(currentMonth),
          })
        ).error;
      }

      const updated = await supabase
        .from("income_template_items")
        .update(details)
        .eq("id", existingId);
      if (updated.error !== null) {
        return updated.error;
      }
      return writeIncomeBaseline(supabase, household.id, existingId, amount, currentMonth);
    },
    content.settings.incomeSourceSaved,
    formData,
  );
}

/** You may rename yourself and nobody else — Row Level Security agrees. */
export async function saveProfile(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(profileInputSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async ({ userId }, supabase) =>
      (await supabase.from("profiles").update(parsed.data).eq("id", userId)).error,
    content.settings.profileSaved,
    formData,
  );
}

export async function saveHousehold(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(householdInputSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  return mutate(
    async ({ household }, supabase) =>
      (await supabase.from("households").update(parsed.data).eq("id", household.id)).error,
    content.settings.householdSaved,
    formData,
  );
}
