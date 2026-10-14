import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ProgressRing } from "@/components/charts/progress-ring";
import { Amount } from "@/components/money/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content, elapsedLabel, ofIncomeTotal } from "@/content/es";
import { percentageOf } from "@/lib/calculations/money";
import type { MonthSummary } from "@/lib/calculations/dashboard";
import { formatCop } from "@/lib/format/currency";
import { ROUTES } from "@/lib/routes";
import { spendStatus, statusFill } from "@/lib/ui/status";

/** The month's spending against what came in: a ring, the figure, and the pace. */
function IncomeRing({ summary }: { summary: MonthSummary }) {
  const used = percentageOf(summary.expenses.actual, summary.income.actual);

  return (
    <div className="grid justify-items-center gap-3">
      <ProgressRing
        className="size-40"
        value={used}
        label={content.dashboard.incomeSpent}
        fill={statusFill(spendStatus(used))}
        marker={{ value: summary.monthProgress, label: content.dashboard.paceMarker }}
      >
        <span className="grid gap-0.5">
          {/* The ring carries the status colour; the figure stays in text ink,
              where it is legible at every step of the palette. */}
          <span className="text-3xl font-semibold tabular-nums">{used}%</span>
          <Amount value={summary.expenses.actual} compact className="text-sm" />
        </span>
      </ProgressRing>

      <div className="text-muted-foreground grid justify-items-center gap-0.5 text-xs">
        <p>{ofIncomeTotal(formatCop(summary.income.actual))}</p>
        <p>{elapsedLabel(summary.monthProgress)}</p>
      </div>
    </div>
  );
}

/**
 * A month with no income recorded yet.
 *
 * No ring: an empty circle would be a chart of a number that does not exist.
 * What is left is the figure that *is* real — what has gone out so far — and
 * the one action that would make the rest of this card work.
 */
function NoIncome({ spent }: { spent: number }) {
  return (
    <div className="grid justify-items-center gap-3 text-center">
      <div className="grid gap-1">
        <Amount value={spent} className="text-3xl" />
        <p className="text-muted-foreground text-sm">{content.dashboard.spent}</p>
      </div>
      <p className="text-muted-foreground max-w-xs text-sm">
        {content.dashboard.incomeSpentEmptyHint}
      </p>
      <Button asChild variant="outline" size="sm">
        <Link href={ROUTES.income}>
          {content.dashboard.goToIncome}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </Button>
    </div>
  );
}

/**
 * How much of what came in has gone, and how much of the month.
 *
 * The household's version of each person's ring. Income is only what was
 * recorded — expected income is not money in hand. The plan is judged
 * elsewhere: category by category in the card beside this one, and in the
 * greeting's pill.
 *
 * The two figures together are the insight: 60% spent is unremarkable on the
 * 27th and alarming on the 9th. The tick on the ring is where the month sits,
 * so the comparison takes no arithmetic.
 */
export function SpendingVsIncome({ summary }: { summary: MonthSummary }) {
  const hasIncome = summary.income.actual > 0;
  const used = percentageOf(summary.expenses.actual, summary.income.actual);

  return (
    <Card className="from-card to-muted/50 bg-linear-to-br">
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">{content.dashboard.incomeSpent}</CardTitle>
        <Badge variant={hasIncome && used >= 100 ? "destructive" : "secondary"}>
          {!hasIncome
            ? content.dashboard.incomeSpentEmpty
            : used >= 100
              ? content.dashboard.overIncome
              : content.dashboard.withinIncome}
        </Badge>
      </CardHeader>

      <CardContent className="grid place-items-center">
        {hasIncome ? (
          <IncomeRing summary={summary} />
        ) : (
          <NoIncome spent={summary.expenses.actual} />
        )}
      </CardContent>
    </Card>
  );
}
