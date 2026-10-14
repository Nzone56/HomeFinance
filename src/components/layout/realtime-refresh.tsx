"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

/**
 * Keeps both partners' devices in step.
 *
 * When anything in the household's data changes, this asks Next to re-render
 * the server components for the current route. It deliberately does not carry
 * the payload into client state: the refreshed server render reads Supabase
 * again, so there is never a second copy of the numbers to fall out of date.
 *
 * Row Level Security applies to Realtime too, so this only ever hears about
 * rows the signed-in user is allowed to see.
 */
export function RealtimeRefresh() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();

    const channel = supabase
      .channel("household-data")
      .on("postgres_changes", { event: "*", schema: "public" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
