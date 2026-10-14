"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { content } from "@/content/es";
import { errorState, parseForm, type ActionState } from "@/lib/actions/state";
import { devLoginCredentials } from "@/lib/auth/dev-login";
import { DEFAULT_AUTHENTICATED_PATH, LOGIN_PATH } from "@/lib/supabase/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { signInSchema } from "@/schemas/auth";

/**
 * The failure message is deliberately the same whether the address is unknown
 * or the password is wrong, so it cannot be used to discover who has an account.
 */
export async function signIn(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(signInSchema, formData);
  if (!parsed.ok) {
    return parsed.state;
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error !== null) {
    return errorState(content.auth.failed);
  }

  revalidatePath("/", "layout");
  redirect(DEFAULT_AUTHENTICATED_PATH);
}

/**
 * One-click sign-in with the test account, for development only.
 *
 * The credentials never travel in the form: they are read here, on the server,
 * and `devLoginCredentials` refuses outside `next dev`. A failure says so — it
 * used to return silently, which made a misconfigured account look like a dead
 * button.
 */
export async function devSignIn(): Promise<ActionState> {
  const credentials = devLoginCredentials();
  if (credentials === null) {
    return errorState(content.auth.failed);
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);

  if (error !== null) {
    return errorState(content.auth.failed);
  }

  revalidatePath("/", "layout");
  redirect(DEFAULT_AUTHENTICATED_PATH);
}

export async function signOut(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect(LOGIN_PATH);
}
