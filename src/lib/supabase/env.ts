/**
 * Both values are meant to reach the browser: the anon key grants nothing on
 * its own, because every table is behind Row Level Security. The service_role
 * key is deliberately absent from this application.
 *
 * Read lazily rather than at module load so a build without the variables set
 * fails where it is actionable, not at import time.
 */

function required(name: string, value: string | undefined): string {
  if (value === undefined || value === "") {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function supabaseEnv(): SupabaseEnv {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: required("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  };
}
