import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";

import { supabaseEnv } from "./env";

/**
 * Server-side client bound to the caller's session cookie.
 *
 * This is the only client the application reads or writes data with, which is
 * what makes Row Level Security the effective authorization boundary: every
 * statement runs as the signed-in user, never as a privileged role.
 */
export async function createServerSupabaseClient() {
  // `cookies()` is awaited before anything else on purpose: it marks the route
  // as dynamic, so a build never tries to prerender a page that is, by
  // definition, per-user.
  const cookieStore = await cookies();
  const env = supabaseEnv();

  return createServerClient<Database>(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the
          // session on every request, so there is nothing to recover here.
        }
      },
    },
  });
}
