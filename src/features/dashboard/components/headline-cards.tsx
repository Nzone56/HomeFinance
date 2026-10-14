import type { ReactNode } from "react";
import { ArrowDownLeft, ArrowUpRight, House, Wallet, type LucideIcon } from "lucide-react";

import { Amount } from "@/components/money/amount";
import { Card, CardContent } from "@/components/ui/card";
import { content, householdShareLabel, planLabel } from "@/content/es";
import type { Comparison, MonthSummary } from "@/lib/calculations/dashboard";
import { formatCop } from "@/lib/format/currency";
import { seriesColor } from "@/lib/ui/series";

interface HeadlineCardProps {
  title: string;
  icon: LucideIcon;
  /** The card's categorical slot — identity, not status. */
  color: string;
  children: ReactNode;
}

function HeadlineCard({ title, icon: Icon, color, children }: HeadlineCardProps) {
  return (
    <Card
      // A wash of the card's own hue rather than a fill: the figure on top
      // stays in text ink, where it is legible in both themes.
      style={{ backgroundColor: `color-mix(in oklab, ${color} 10%, var(--card))` }}
    >
      <CardContent className="grid gap-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid size-9 shrink-0 place-items-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklab, ${color} 25%, transparent)` }}
          >
            <Icon className="size-4" style={{ color }} />
          </span>
          <span className="min-w-0 truncate text-sm font-medium">{title}</span>
        </div>

        {children}
      </CardContent>
    </Card>
  );
}

interface PlanComparisonProps {
  title: string;
  icon: LucideIcon;
  color: string;
  comparison: Comparison;
  /** Expenses are the one figure where coming in *under* plan is the good news. */
  higherIsBetter: boolean;
}

function PlanComparison({ title, icon, color, comparison, higherIsBetter }: PlanComparisonProps) {
  return (
    <HeadlineCard title={title} icon={icon} color={color}>
      <div className="grid gap-1">
        <p className="text-muted-foreground text-xs">{planLabel(formatCop(comparison.planned))}</p>
        <Amount value={comparison.actual} className="text-2xl" />
        <p className="text-xs">
          <Amount
            value={comparison.difference}
            signed
            tone={higherIsBetter ? "auto" : "auto-inverse"}
            className="text-xs"
          />{" "}
          <span className="text-muted-foreground">{content.dashboard.vsPlan}</span>
        </p>
      </div>
    </HeadlineCard>
  );
}

/**
 * The four figures the month is judged by, in one row.
 *
 * Colour here is identity, not state: each card keeps its categorical slot
 * whatever the numbers do, so the status palette stays free to mean "over the
 * plan" and nothing else. Which way a figure went is said in words and in sign,
 * never in colour alone.
 */
export function HeadlineCards({ summary }: { summary: MonthSummary }) {
  const { breakdown } = summary;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <PlanComparison
        title={content.dashboard.income}
        icon={ArrowDownLeft}
        color={seriesColor(2)}
        comparison={summary.income}
        higherIsBetter
      />
      <PlanComparison
        title={content.dashboard.expenses}
        icon={ArrowUpRight}
        color={seriesColor(1)}
        comparison={summary.expenses}
        higherIsBetter={false}
      />
      <PlanComparison
        title={content.dashboard.remaining}
        icon={Wallet}
        color={seriesColor(0)}
        comparison={summary.remaining}
        higherIsBetter
      />

      <HeadlineCard title={content.dashboard.householdCard} icon={House} color={seriesColor(4)}>
        <div className="grid gap-1">
          <p className="text-muted-foreground text-xs">
            {householdShareLabel(breakdown.householdPercentage)}
          </p>
          <Amount value={breakdown.household} className="text-2xl" />
          <p className="text-xs">
            <span className="text-muted-foreground">{content.dashboard.personalSpend}</span>{" "}
            <Amount value={breakdown.personalTotal} className="text-xs" />
          </p>
        </div>
      </HeadlineCard>
    </section>
  );
}
