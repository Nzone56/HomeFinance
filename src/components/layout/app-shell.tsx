import { LogOut } from "lucide-react";
import { Suspense, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { content } from "@/content/es";
import { signOut } from "@/features/auth/actions";
import type { MonthKey } from "@/lib/dates/month";

import { MainNav } from "./main-nav";
import { MonthSwitcher } from "./month-switcher";
import { RealtimeRefresh } from "./realtime-refresh";

interface AppShellProps {
  /** Month to show when the URL does not name one. */
  month: MonthKey;
  /** A slot rather than a string, so the layout can stream it in. */
  householdName: ReactNode;
  /** The signed-in member's mark, shown in the header so it is never in doubt. */
  userMark: ReactNode;
  children: ReactNode;
}

/**
 * The frame every signed-in page sits in.
 *
 * Navigation appears twice from one definition: a row in the header on desktop
 * and a thumb-reachable bar at the bottom on phones, which is where this app is
 * used most.
 */
export function AppShell({ month, householdName, userMark, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-app items-center gap-2 px-4 py-3">
          <span className="hidden min-w-0 flex-1 truncate font-semibold sm:block">
            {householdName}
          </span>

          <div className="flex flex-1 justify-center sm:flex-none">
            {/* The month comes from the URL. Behind Suspense so the frame — which
                now awaits nothing — can still be prerendered around it. */}
            <Suspense fallback={<Skeleton className="h-9 w-48" />}>
              <MonthSwitcher defaultMonth={month} />
            </Suspense>
          </div>

          <div className="flex items-center justify-end gap-1 sm:flex-1">
            {userMark}
            <ThemeToggle />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="icon" aria-label={content.nav.signOut}>
                <LogOut className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </div>
        </div>

        <div className="mx-auto hidden w-full max-w-app px-4 pb-2 md:block">
          <Suspense fallback={<Skeleton className="h-9 w-full max-w-md" />}>
            <MainNav defaultMonth={month} variant="bar" />
          </Suspense>
        </div>
      </header>

      <main className="mx-auto w-full max-w-app flex-1 px-4 py-6 pb-28 md:pb-10">{children}</main>

      <div className="pb-safe fixed inset-x-0 bottom-0 z-40 md:hidden">
        <Suspense fallback={<Skeleton className="h-14 w-full rounded-none" />}>
          <MainNav defaultMonth={month} variant="tabs" />
        </Suspense>
      </div>

      <RealtimeRefresh />
    </div>
  );
}
