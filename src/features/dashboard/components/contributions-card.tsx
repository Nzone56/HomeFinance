import { Amount } from "@/components/money/amount";
import { MemberAvatar } from "@/components/people/member-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/charts/meter";
import { content } from "@/content/es";
import type { ContributionRow } from "@/lib/calculations/dashboard";
import { memberColor, type MemberColors } from "@/lib/ui/member-colors";

/**
 * What each person carries this month: their own expenses plus their part of
 * the shared ones — not whose card happened to be used.
 */
interface ContributionsCardProps {
  rows: readonly ContributionRow[];
  colors: MemberColors;
}

export function ContributionsCard({ rows, colors }: ContributionsCardProps) {
  const hasActivity = rows.some((row) => row.spent > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{content.dashboard.contributions}</CardTitle>
      </CardHeader>

      <CardContent>
        {!hasActivity ? (
          <p className="text-muted-foreground text-sm">{content.dashboard.contributionsEmpty}</p>
        ) : (
          <ul className="appear-children grid gap-4">
            {rows.map((row) => (
              <li key={row.userId} className="grid gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <MemberAvatar name={row.displayName} color={memberColor(colors, row.userId)} />
                    <span className="truncate text-sm font-medium">{row.displayName}</span>
                  </span>
                  <Amount value={row.spent} className="text-sm" />
                </div>
                <Meter
                  value={row.percentageOfTotal}
                  label={row.displayName}
                  fill={memberColor(colors, row.userId)}
                />
                <p className="text-muted-foreground text-xs">{row.percentageOfTotal}%</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
