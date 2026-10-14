import { Amount } from "@/components/money/amount";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/charts/meter";
import { content, overBudgetSummary } from "@/content/es";
import { withActivity, type CategoryPlanRow } from "@/lib/calculations/budget";
import { spendStatus, statusFill } from "@/lib/ui/status";

/**
 * Planned against actual, category by category.
 *
 * Categories with no plan and no spending are hidden: an empty row for every
 * unused category buries the ones that matter.
 */
export function PlanVsActual({ rows }: { rows: readonly CategoryPlanRow[] }) {
  const visible = withActivity(rows);
  const overBudgetCount = visible.filter((row) => row.isOverBudget).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{content.dashboard.planVsActual}</CardTitle>
        {visible.length > 0 ? (
          <Badge variant={overBudgetCount > 0 ? "destructive" : "secondary"}>
            {overBudgetSummary(overBudgetCount, visible.length)}
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent>
        {visible.length === 0 ? (
          <p className="text-muted-foreground text-sm">{content.dashboard.planEmpty}</p>
        ) : (
          <ul className="appear-children grid gap-4">
            {visible.map((row) => (
              <li key={row.categoryId} className="grid gap-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{row.categoryName}</span>
                  <span className="text-sm whitespace-nowrap">
                    <Amount value={row.actual} />
                    <span className="text-muted-foreground"> / </span>
                    <Amount value={row.planned} tone="muted" />
                  </span>
                </div>

                <Meter
                  value={row.percentage}
                  label={row.categoryName}
                  fill={statusFill(spendStatus(row.percentage))}
                />

                <div className="text-muted-foreground flex items-center justify-between gap-2 text-xs">
                  <span>
                    {row.isOverridden ? (
                      <Badge variant="outline" className="font-normal">
                        {content.budget.overridden}
                      </Badge>
                    ) : null}
                  </span>
                  <Amount value={row.difference} signed tone="auto-inverse" className="text-xs" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
