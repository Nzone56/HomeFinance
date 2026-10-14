"use client";

import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { content } from "@/content/es";
import { shiftMonthKey, type MonthKey } from "@/lib/dates/month";
import { formatMonthLabel } from "@/lib/format/date";
import { withMonth } from "@/lib/routes";

import { useSelectedMonth } from "./use-selected-month";

interface MonthSwitcherProps {
  /**
   * Month to use when the URL does not name one — which is the current month,
   * and therefore also what "go back to now" means.
   */
  defaultMonth: MonthKey;
}

/**
 * Moves between months by rewriting the URL, so the server re-renders with the
 * new month and the view stays linkable and shareable.
 *
 * `replace` rather than `push`: stepping through six months should not leave
 * six entries in the back stack.
 */
export function MonthSwitcher({ defaultMonth }: MonthSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const month = useSelectedMonth(defaultMonth);

  function goTo(next: MonthKey) {
    router.replace(withMonth(pathname, next, new URLSearchParams(searchParams.toString())), {
      scroll: false,
    });
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label={content.a11y.monthNavigation}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={content.month.previous}
        onClick={() => goTo(shiftMonthKey(month, -1))}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </Button>

      <span className="min-w-36 text-center text-sm font-medium" data-testid="current-month">
        {formatMonthLabel(month)}
      </span>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={content.month.next}
        onClick={() => goTo(shiftMonthKey(month, 1))}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </Button>

      {month === defaultMonth ? null : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={content.month.current}
          onClick={() => goTo(defaultMonth)}
        >
          <CalendarCheck className="size-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
