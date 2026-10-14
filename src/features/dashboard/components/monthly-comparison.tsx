import { GroupedBars, type BarSeries } from "@/components/charts/grouped-bars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import type { MonthSummary } from "@/lib/calculations/dashboard";
import { seriesColor } from "@/lib/ui/series";

/**
 * The month's three headline figures, planned against actual.
 *
 * Two series, so a legend is always present. Everything plotted is money, so
 * one y-scale carries all of it — and "Disponible" can go negative, which is
 * why the zero line is drawn rather than implied.
 */
export function MonthlyComparison({ summary }: { summary: MonthSummary }) {
  const planned: BarSeries = {
    key: "planned",
    label: content.dashboard.planned,
    color: seriesColor(3),
  };
  const actual: BarSeries = {
    key: "actual",
    label: content.dashboard.actual,
    color: seriesColor(0),
  };

  const groups = [
    { key: "income", label: content.dashboard.income, comparison: summary.income },
    { key: "expenses", label: content.dashboard.expenses, comparison: summary.expenses },
    { key: "remaining", label: content.dashboard.remaining, comparison: summary.remaining },
  ].map((group) => ({
    key: group.key,
    label: group.label,
    bars: [
      { series: planned, value: group.comparison.planned },
      { series: actual, value: group.comparison.actual },
    ],
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{content.dashboard.monthlyComparison}</CardTitle>
      </CardHeader>

      <CardContent>
        <GroupedBars
          series={[planned, actual]}
          groups={groups}
          label={content.dashboard.monthlyComparison}
        />
      </CardContent>
    </Card>
  );
}
