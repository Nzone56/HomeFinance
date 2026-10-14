import { ProgressRing } from "@/components/charts/progress-ring";
import { Amount } from "@/components/money/amount";
import { MemberAvatar } from "@/components/people/member-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import type { PersonSummary } from "@/lib/calculations/people";
import { memberColor, type MemberColors } from "@/lib/ui/member-colors";
import { spendStatus, statusFill } from "@/lib/ui/status";

interface PersonSummariesProps {
  people: readonly PersonSummary[];
  colors: MemberColors;
}

interface LegendRowProps {
  label: string;
  value: number;
  /** A dot in the row's own colour. Omitted, the row indents under the one above. */
  color?: string;
  tone?: "default" | "auto" | "muted";
}

function LegendRow({ label, value, color, tone = "default" }: LegendRowProps) {
  return (
    // Centred, not baseline-aligned: an indented row starts with an empty spacer,
    // which has no text baseline and lifted the amount above its label.
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground flex min-w-0 items-center gap-2 text-xs">
        {color === undefined ? (
          <span aria-hidden="true" className="w-2.5 shrink-0" />
        ) : (
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
        )}
        <span className="truncate">{label}</span>
      </span>
      <Amount value={value} tone={tone} className="text-xs whitespace-nowrap" />
    </div>
  );
}

/**
 * The month from each person's own side.
 *
 * The ring is how much of what came in has already gone — the same question
 * the household ring asks, asked of one person — so it wears a status colour,
 * and the avatar beside it carries who it belongs to. Past 100% the month is
 * being funded from something other than this month's income, which is exactly
 * the thing worth seeing without doing arithmetic.
 *
 * "Sus gastos" is their part of the month: their personal expenses plus their
 * percentage of every shared one, whichever card it went on. Shared expenses
 * create no debt between the two, so there is no balance to show.
 */
export function PersonSummaries({ people, colors }: PersonSummariesProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{content.dashboard.byPerson}</CardTitle>
        <CardDescription>{content.dashboard.byPersonHint}</CardDescription>
      </CardHeader>

      <CardContent>
        <ul className="appear-children grid gap-6 sm:grid-cols-2">
          {people.map((person) => {
            const hasIncome = person.income > 0;
            const color = memberColor(colors, person.userId);

            return (
              // content-start: the two columns share a row height, and without it
              // the one with no "sin ingresos" line spread its rows apart to fill it.
              <li key={person.userId} className="grid content-start justify-items-center gap-4">
                <div className="flex items-center gap-2">
                  <MemberAvatar name={person.displayName} color={color} />
                  <span className="truncate text-sm font-medium">{person.displayName}</span>
                </div>

                <ProgressRing
                  className="size-32"
                  value={person.spentPercentage}
                  label={person.displayName}
                  fill={statusFill(spendStatus(person.spentPercentage))}
                >
                  <span className="grid gap-0.5">
                    {/* The ring carries the status colour; the figure stays in
                        text ink, legible at every step of the palette. */}
                    <span className="text-2xl font-semibold tabular-nums">
                      {person.spentPercentage}%
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {content.dashboard.ofIncomeSpent}
                    </span>
                  </span>
                </ProgressRing>

                <div className="grid w-full gap-1.5">
                  <LegendRow
                    label={content.dashboard.income}
                    value={person.income}
                    color="var(--chart-3)"
                  />
                  <LegendRow
                    label={content.dashboard.personSpent}
                    value={person.spent}
                    color="var(--chart-2)"
                  />
                  <LegendRow
                    label={content.dashboard.personShared}
                    value={person.spentShared}
                    tone="muted"
                  />
                  <LegendRow
                    label={content.dashboard.personPersonal}
                    value={person.spentPersonal}
                    tone="muted"
                  />

                  <div className="grid gap-1.5 border-t pt-1.5">
                    <LegendRow
                      label={content.dashboard.personAvailable}
                      value={person.available}
                      color="var(--chart-1)"
                      tone="auto"
                    />
                  </div>
                </div>

                {hasIncome ? null : (
                  <p className="text-muted-foreground text-center text-xs">
                    {content.dashboard.personIncomeEmpty}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
