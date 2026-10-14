import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { supabaseEnv } from "./env";

/**
 * Browser-side client. Used only for Realtime subscriptions and for signing
 * out — every read and write goes through the server, where the session cookie
 * is authoritative.
 */
export function createBrowserSupabaseClient() {
  const env = supabaseEnv();
  return createBrowserClient<Database>(env.url, env.anonKey);
}
