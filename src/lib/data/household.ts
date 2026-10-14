import { redirect } from "next/navigation";
import { cache } from "react";

import { LOGIN_PATH } from "@/lib/supabase/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { HouseholdRole, HouseholdRow } from "@/types/database";

import { maybeRowOf, rowsOf } from "./query";

export interface HouseholdMemberSummary {
  userId: string;
  displayName: string;
  role: HouseholdRole;
}

export interface HouseholdContext {
  userId: string;
  household: HouseholdRow;
  members: HouseholdMemberSummary[];
}

/**
 * The signed-in user together with the household they belong to.
 *
 * None of the queries below filter by household: Row Level Security already
 * restricts every table to the caller's own household, so asking for "all
 * members" returns exactly the household's members and nothing else. That is
 * the authorization boundary doing its job, and it is why a bug in this file
 * cannot leak another household's data.
 *
 * Returns `null` when there is no session, or when the user has a session but
 * no membership yet.
 *
 * Wrapped in React's `cache` so the layout and the page it renders resolve the
 * household once between them rather than each running these three queries.
 *
 * The session is verified with `getClaims`, which checks the token's signature
 * locally against the cached signing keys instead of asking Supabase Auth on
 * every render. Nothing is lost by it: PostgREST authorizes each query below by
 * that very same token, and RLS by the user id inside it. The three queries
 * then run together — none of them needs another's answer to be asked.
 */
export const getHouseholdContext = cache(async (): Promise<HouseholdContext | null> => {
  const supabase = await createServerSupabaseClient();

  const { data: auth } = await supabase.auth.getClaims();

  if (auth === null) {
    return null;
  }

  const [household, memberships, profiles] = await Promise.all([
    maybeRowOf("load household", () =>
      supabase.from("households").select("*").limit(1).maybeSingle(),
    ),
    rowsOf("load household members", () =>
      supabase.from("household_members").select("*").order("joined_at"),
    ),
    rowsOf("load profiles", () => supabase.from("profiles").select("*")),
  ]);

  if (household === null) {
    return null;
  }

  const displayNames = new Map(profiles.map((profile) => [profile.id, profile.display_name]));

  const members = memberships.map((membership) => ({
    userId: membership.user_id,
    displayName: displayNames.get(membership.user_id) ?? membership.user_id,
    role: membership.role,
  }));

  return { userId: auth.claims.sub, household, members };
});

/**
 * The household context, or a redirect to the login screen.
 *
 * Every authenticated page calls this. The middleware already turns anonymous
 * visitors away, but a page must not depend on it: this check runs on the
 * server, inside the request that actually reads the data.
 */
export async function requireHouseholdContext(): Promise<HouseholdContext> {
  const context = await getHouseholdContext();
  if (context === null) {
    redirect(LOGIN_PATH);
  }
  return context;
}
