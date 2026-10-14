import { Amount } from "@/components/money/amount";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import type { ExpenseBreakdown } from "@/lib/calculations/breakdown";
import { percentageOf } from "@/lib/calculations/money";
import { seriesColor } from "@/lib/ui/series";

interface Segment {
  key: string;
  label: string;
  amount: number;
  color: string;
}

/**
 * What the household bought together against what each person bought for
 * themselves, as one part-to-whole bar.
 *
 * Same dividing line as the settlement — the `shared` flag — so the two cards
 * can never disagree about what counts as a household cost.
 *
 * Every segment is named and valued in the list below the bar, so the colours
 * label the parts rather than carrying the meaning on their own.
 */
export function BreakdownCard({ breakdown }: { breakdown: ExpenseBreakdown }) {
  const segments: Segment[] = [
    {
      key: "household",
      label: content.dashboard.householdSpend,
      amount: breakdown.household,
      color: seriesColor(0),
    },
    ...breakdown.personal.map((person, index) => ({
      key: person.userId,
      label: person.displayName,
      amount: person.amount,
      // The household holds slot 0, so each person starts from the next one.
      color: seriesColor(index + 1),
    })),
  ].filter((segment) => segment.amount > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{content.dashboard.breakdown}</CardTitle>
      </CardHeader>

      <CardContent>
        {breakdown.total === 0 ? (
          <p className="text-muted-foreground text-sm">{content.dashboard.breakdownEmpty}</p>
        ) : (
          <div className="grid gap-3">
            {/* A 2px surface gap does the separating between segments — never a
                border, which would add ink that is not data. */}
            <div
              className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
              role="img"
              aria-label={content.dashboard.breakdown}
            >
              {segments.map((segment) => (
                <div
                  key={segment.key}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{
                    width: `${percentageOf(segment.amount, breakdown.total)}%`,
                    backgroundColor: segment.color,
                  }}
                />
              ))}
            </div>

            <ul className="grid gap-1.5">
              {segments.map((segment) => (
                <li key={segment.key} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden="true"
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: segment.color }}
                    />
                    <span className="truncate">{segment.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {percentageOf(segment.amount, breakdown.total)}%
                    </span>
                  </span>
                  <Amount value={segment.amount} className="text-sm" />
                </li>
              ))}
            </ul>

            <div className="text-muted-foreground flex items-center justify-between gap-2 border-t pt-2 text-xs">
              <span>{content.dashboard.personalSpend}</span>
              <Amount value={breakdown.personalTotal} className="text-xs" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
