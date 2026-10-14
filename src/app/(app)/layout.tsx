import { Suspense, type ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { HouseholdName, SignedInMember } from "@/components/layout/shell-identity";
import { Skeleton } from "@/components/ui/skeleton";
import { currentMonthKey } from "@/lib/dates/month";

/**
 * The authenticated area.
 *
 * The frame renders without waiting for anything: the household's name and the
 * signed-in member's mark stream in behind their own Suspense boundaries.
 * Awaiting them here blocked every navigation until Supabase answered, and kept
 * each route's `loading.tsx` from ever showing — Next can only show a loading
 * state below a layout that has finished rendering.
 *
 * The session is still checked on the server for every request: each page and
 * both identity slots call `requireHouseholdContext` (cached, so it runs once),
 * and Row Level Security sits beneath all of it.
 */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell
      month={currentMonthKey(new Date())}
      householdName={
        <Suspense fallback={<Skeleton className="h-5 w-32" />}>
          <HouseholdName />
        </Suspense>
      }
      userMark={
        <Suspense fallback={<Skeleton className="size-9 rounded-full" />}>
          <SignedInMember />
        </Suspense>
      }
    >
      {children}
    </AppShell>
  );
}
