import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Meter } from "@/components/charts/meter";
import { Amount } from "@/components/money/amount";
import { MemberAvatar } from "@/components/people/member-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import { percentageOf } from "@/lib/calculations/money";
import type { UserIncomeRow } from "@/lib/calculations/income";
import { ROUTES } from "@/lib/routes";
import { memberColor, type MemberColors } from "@/lib/ui/member-colors";

interface IncomeProgressProps {
  rows: readonly UserIncomeRow[];
  colors: MemberColors;
}

/**
 * What each person expected against what actually arrived.
 *
 * The meter wears the person's own categorical colour rather than a status one:
 * income landing short of plan is information, not an alarm, and the signed
 * difference beside it already says which way it went.
 */
export function IncomeProgress({ rows, colors }: IncomeProgressProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">{content.income.expectedVsActual}</CardTitle>
        <Link
          href={ROUTES.income}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          {content.dashboard.seeAll}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </CardHeader>

      <CardContent>
        <ul className="appear-children grid gap-4">
          {rows.map((row) => (
            <li key={row.userId} className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <MemberAvatar name={row.displayName} color={memberColor(colors, row.userId)} />
                  <span className="truncate text-sm font-medium">{row.displayName}</span>
                </span>
                <span className="flex shrink-0 items-baseline gap-1.5 text-sm whitespace-nowrap">
                  <Amount value={row.actual} className="text-sm" />
                  <span className="text-muted-foreground text-xs">/</span>
                  <Amount value={row.expected} tone="muted" className="text-xs" />
                </span>
              </div>

              <Meter
                value={percentageOf(row.actual, row.expected)}
                label={row.displayName}
                fill={memberColor(colors, row.userId)}
              />

              <Amount
                value={row.difference}
                signed
                tone="auto"
                className="justify-self-end text-xs"
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
