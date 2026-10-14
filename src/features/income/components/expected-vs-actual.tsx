import { Amount } from "@/components/money/amount";
import { MemberAvatar } from "@/components/people/member-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import type { UserIncomeRow } from "@/lib/calculations/income";
import { memberColor, type MemberColors } from "@/lib/ui/member-colors";

/**
 * Expected against received, per person.
 *
 * The difference is the number worth looking at: income that varies month to
 * month is exactly why the app separates the two.
 */
interface ExpectedVsActualProps {
  rows: readonly UserIncomeRow[];
  colors: MemberColors;
}

export function ExpectedVsActual({ rows, colors }: ExpectedVsActualProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{content.income.expectedVsActual}</CardTitle>
      </CardHeader>

      <CardContent>
        <ul className="grid gap-3">
          {rows.map((row) => (
            <li key={row.userId} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <MemberAvatar name={row.displayName} color={memberColor(colors, row.userId)} />
                <span className="truncate text-sm font-medium">{row.displayName}</span>
              </span>
              <span className="flex items-baseline gap-2 whitespace-nowrap">
                <Amount value={row.actual} className="text-sm" />
                <span className="text-muted-foreground text-xs">/</span>
                <Amount value={row.expected} tone="muted" className="text-sm" />
                <Amount value={row.difference} signed tone="auto" className="text-xs" />
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
