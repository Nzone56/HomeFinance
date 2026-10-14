import type { PostgrestError } from "@supabase/supabase-js";

import { content } from "@/content/es";
import { requireHouseholdContext, type HouseholdContext } from "@/lib/data/household";
import { createServerSupabaseClient } from "@/lib/supabase/server";

import { errorState, formValues, successState, type ActionState } from "./state";

export type AppSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * Runs one write as the signed-in user and reports how it went.
 *
 * Two things every mutation in the app depends on happen here:
 *
 *   - The household is resolved on the server, from the session. An action
 *     never takes `household_id` from the submitted form, so a tampered request
 *     cannot aim a write at another household — and Row Level Security would
 *     reject it even if one tried.
 *   - A database rejection becomes renderable state rather than an exception,
 *     so the form can show it without losing what the user typed.
 *
 * It deliberately does not revalidate. `revalidatePath` inside an action
 * re-renders the page in the same response as the save, so a gateway timeout
 * while reloading reported a saved card payment as a failed save. The client
 * reloads once the success is in — see `ActionFeedback`.
 */
export async function mutate(
  run: (context: HouseholdContext, supabase: AppSupabaseClient) => Promise<PostgrestError | null>,
  successMessage: string,
  /** The submitted form, so a rejected write does not clear what was typed. */
  formData?: FormData,
): Promise<ActionState> {
  const context = await requireHouseholdContext();
  const supabase = await createServerSupabaseClient();

  const error = await run(context, supabase);
  if (error !== null) {
    return errorState(
      content.common.genericError,
      {},
      formData === undefined ? {} : formValues(formData),
    );
  }

  return successState(successMessage);
}
