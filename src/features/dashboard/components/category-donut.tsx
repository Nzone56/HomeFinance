import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DonutChart, type DonutSlice } from "@/components/charts/donut-chart";
import { Amount } from "@/components/money/amount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import { totalOfShares, type CategoryShare } from "@/lib/calculations/category-share";
import { labelFor } from "@/features/transactions/lib/labels";
import { ROUTES } from "@/lib/routes";
import { OTHER_CATEGORY_COLOR } from "@/lib/ui/category-colors";

interface CategoryDonutProps {
  shares: readonly CategoryShare[];
  /** Shared with every other card that names a category — see `buildCategoryColors`. */
  colors: ReadonlyMap<string, string>;
}

/**
 * Where the month's money actually went.
 *
 * Part-to-whole, so a donut with the total in the hole. Every slice is named,
 * valued and given its share in the legend beside it — the colours label the
 * parts rather than carrying the meaning on their own.
 */
export function CategoryDonut({ shares, colors }: CategoryDonutProps) {
  const total = totalOfShares(shares);
  const colorOf = (share: CategoryShare) =>
    labelFor(colors, share.categoryId, OTHER_CATEGORY_COLOR);

  const slices: DonutSlice[] = shares.map((share) => ({
    key: share.categoryId,
    label: share.name,
    percentage: share.percentage,
    color: colorOf(share),
  }));

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">{content.dashboard.byCategory}</CardTitle>
        <Link
          href={ROUTES.expenses}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          {content.dashboard.seeAll}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </CardHeader>

      <CardContent>
        {slices.length === 0 ? (
          <p className="text-muted-foreground text-sm">{content.dashboard.byCategoryEmpty}</p>
        ) : (
          // Side by side only once the card itself is wide enough. On a desktop
          // the card is a narrow column, and beside the donut the legend was
          // pushed past the card's edge, clipping every percentage. min-w-0 lets
          // a long category name truncate instead of doing the same.
          <div className="@container">
            <div className="grid items-center gap-5 @md:grid-cols-[auto_1fr]">
              <DonutChart
                className="mx-auto size-40"
                slices={slices}
                label={content.dashboard.byCategory}
              >
                <span className="grid gap-0.5">
                  <Amount value={total} compact className="text-xl" />
                  <span className="text-muted-foreground text-xs">
                    {content.dashboard.totalSpent}
                  </span>
                </span>
              </DonutChart>

              <ul className="grid min-w-0 gap-2">
                {shares.map((share) => (
                  <li key={share.categoryId} className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        aria-hidden="true"
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: colorOf(share) }}
                      />
                      <span className="truncate text-sm">{share.name}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2 whitespace-nowrap">
                      <Amount value={share.amount} className="text-sm" />
                      <span className="text-muted-foreground w-8 text-right text-xs tabular-nums">
                        {share.percentage}%
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
