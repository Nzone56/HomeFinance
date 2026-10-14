import type { PostgrestError } from "@supabase/supabase-js";

import type { AppSupabaseClient } from "@/lib/actions/mutate";
import { isoDateToMonthKey, monthKeyToIsoDate, type MonthKey } from "@/lib/dates/month";

/**
 * Sets what an income source is expected to bring from `month` onward.
 *
 * A source that starts this month (or later) has no past to protect, so its
 * starting amount is simply corrected. Otherwise the change is recorded as its
 * own row from `month`, which is what keeps earlier months expecting what they
 * expected at the time. Writing the same month twice replaces that month's
 * change rather than stacking a second one.
 */
export async function writeIncomeBaseline(
  supabase: AppSupabaseClient,
  householdId: string,
  templateItemId: string,
  amount: number,
  month: MonthKey,
): Promise<PostgrestError | null> {
  const { data: item, error } = await supabase
    .from("income_template_items")
    .select("starts_on")
    .eq("id", templateItemId)
    .maybeSingle();

  if (error !== null) {
    return error;
  }

  // A row Row Level Security hides reads as missing; the update then touches
  // nothing, which is the right outcome for a source that is not yours.
  if (item === null || isoDateToMonthKey(item.starts_on) >= month) {
    return (
      await supabase.from("income_template_items").update({ amount }).eq("id", templateItemId)
    ).error;
  }

  return (
    await supabase.from("income_template_amounts").upsert(
      {
        household_id: householdId,
        template_item_id: templateItemId,
        effective_from: monthKeyToIsoDate(month),
        amount,
      },
      { onConflict: "household_id,template_item_id,effective_from" },
    )
  ).error;
}

/**
 * Whether a payment method is a credit card. Income never lands on one — a card
 * is money owed, not an account money arrives in.
 */
export async function isCreditCard(
  supabase: AppSupabaseClient,
  paymentMethodId: string | null,
): Promise<boolean> {
  if (paymentMethodId === null) {
    return false;
  }

  const { data } = await supabase
    .from("payment_methods")
    .select("type")
    .eq("id", paymentMethodId)
    .maybeSingle();

  return data?.type === "credit_card";
}
