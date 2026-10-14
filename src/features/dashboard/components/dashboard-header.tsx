import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { content, greeting } from "@/content/es";
import { monthKeyToDate, type MonthKey } from "@/lib/dates/month";
import { formatMonthLabel } from "@/lib/format/date";
import { ROUTES, withMonth } from "@/lib/routes";
import { spendStatus, statusFill, type SpendStatus } from "@/lib/ui/status";

interface DashboardHeaderProps {
  /** The signed-in member, so the page greets whoever is looking at it. */
  name: string;
  month: MonthKey;
  /** The month the clock is in, resolved once on the server. */
  currentMonth: MonthKey;
  /** Spending against the plan, 0–100, or `null` when there is no plan. */
  planUsed: number | null;
}

const STATUS_TEXT: Record<SpendStatus, string> = {
  good: content.dashboard.allGood,
  warning: content.dashboard.closeToPlan,
  critical: content.dashboard.overBudget,
};

/**
 * Who is looking, which month, and whether anything needs attention.
 *
 * The month the household is living in is the subject of this page, so it is
 * the largest thing on it. Any other month is a deliberate detour and says so,
 * with one click back rather than a hunt through the chevrons.
 *
 * The pill is the only place on the dashboard where a status colour appears as
 * a bare dot, and it is always read out in words beside it.
 */
export function DashboardHeader({ name, month, currentMonth, planUsed }: DashboardHeaderProps) {
  const isCurrent = month === currentMonth;
  const isPast = monthKeyToDate(month) < monthKeyToDate(currentMonth);
  const status = planUsed === null ? null : spendStatus(planUsed);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{greeting(name)}</h1>
        <p className="text-muted-foreground text-sm">{content.dashboard.subtitle}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {status === null ? (
          <Badge variant="outline" className="font-normal">
            {content.dashboard.budgetEmpty}
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1.5 font-normal">
            <span
              aria-hidden="true"
              className="size-2 rounded-full"
              style={{ backgroundColor: statusFill(status) }}
            />
            {STATUS_TEXT[status]}
          </Badge>
        )}

        {isCurrent ? (
          <Badge variant="secondary" className="font-normal">
            {formatMonthLabel(month)}
          </Badge>
        ) : (
          <>
            <Badge variant="outline" className="font-normal">
              {isPast ? content.month.past : content.month.future}
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={withMonth(ROUTES.dashboard, currentMonth)}>
                <CalendarCheck className="size-4" aria-hidden="true" />
                {content.month.current}
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
