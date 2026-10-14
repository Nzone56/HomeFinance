"use client";

import { ArrowLeftRight, LayoutDashboard, Settings, Target, Wallet } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { content } from "@/content/es";
import type { MonthKey } from "@/lib/dates/month";
import { ROUTES, withMonth, type AppRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

import { useSelectedMonth } from "./use-selected-month";

const NAV_ITEMS: { href: AppRoute; label: string; icon: typeof LayoutDashboard }[] = [
  { href: ROUTES.dashboard, label: content.nav.dashboard, icon: LayoutDashboard },
  { href: ROUTES.expenses, label: content.nav.expenses, icon: ArrowLeftRight },
  { href: ROUTES.income, label: content.nav.income, icon: Wallet },
  { href: ROUTES.budget, label: content.nav.budget, icon: Target },
  { href: ROUTES.settings, label: content.nav.settings, icon: Settings },
];

interface MainNavProps {
  /** Month to use when the URL does not name one. */
  defaultMonth: MonthKey;
  /** `bar` is the desktop header row; `tabs` is the mobile bottom bar. */
  variant: "bar" | "tabs";
}

/**
 * One nav definition rendered two ways, so a route can never appear in the
 * desktop header but go missing on mobile.
 *
 * Every link carries the selected month, so switching views keeps you in the
 * month you were looking at.
 */
export function MainNav({ defaultMonth, variant }: MainNavProps) {
  const pathname = usePathname();
  const month = useSelectedMonth(defaultMonth);
  const isTabs = variant === "tabs";

  return (
    <nav
      aria-label={content.nav.label}
      className={cn(
        isTabs
          ? "bg-background/95 supports-[backdrop-filter]:bg-background/80 grid grid-cols-5 border-t backdrop-blur"
          : "flex items-center gap-1",
      )}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={withMonth(item.href, month)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:outline-none",
              isTabs
                ? "flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-[11px]"
                : "hover:bg-muted flex items-center gap-2 px-3 py-2 text-sm font-medium",
              isActive ? "text-foreground" : "text-muted-foreground",
              !isTabs && isActive && "bg-muted",
            )}
          >
            <Icon className={cn(isTabs ? "size-5" : "size-4")} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
