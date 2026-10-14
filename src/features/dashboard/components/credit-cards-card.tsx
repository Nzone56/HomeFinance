import { Amount } from "@/components/money/amount";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Meter } from "@/components/charts/meter";
import { content } from "@/content/es";
import type { CreditCardStatus } from "@/lib/calculations/credit-cards";
import { formatIsoDate } from "@/lib/dates/month";
import { formatDayLabel } from "@/lib/format/date";
import { spendStatus, statusFill } from "@/lib/ui/status";

/**
 * Debt, headroom and the two dates that matter for each card.
 *
 * "Usado" counts purchases minus payments, so a card paid off in full reads
 * zero even though the purchases still count as expenses for their month.
 */
export function CreditCardsCard({ statuses }: { statuses: readonly CreditCardStatus[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{content.dashboard.creditCards}</CardTitle>
      </CardHeader>

      <CardContent>
        {statuses.length === 0 ? (
          <p className="text-muted-foreground text-sm">{content.dashboard.creditCardsEmpty}</p>
        ) : (
          <ul className="appear-children grid gap-5">
            {statuses.map((status) => (
              <li key={status.card.id} className="grid gap-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">{status.card.name}</span>
                  {status.available === 0 ? (
                    <Badge variant="destructive">{content.creditCard.overLimit}</Badge>
                  ) : null}
                </div>

                <Meter
                  value={status.utilization}
                  label={status.card.name}
                  fill={statusFill(spendStatus(status.utilization))}
                />

                {/* Four columns only once the card itself is wide enough. Keyed
                    to the screen, they showed inside a narrow dashboard column
                    and broke "$ 14.800.000" across two lines. */}
                <div className="@container">
                  <dl className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 text-xs @md:grid-cols-4">
                    <div className="flex justify-between gap-2 @md:block">
                      <dt>{content.creditCard.used}</dt>
                      <dd className="whitespace-nowrap">
                        <Amount value={status.used} className="text-xs" />
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 @md:block">
                      <dt>{content.creditCard.available}</dt>
                      <dd className="whitespace-nowrap">
                        <Amount value={status.available} className="text-xs" />
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 @md:block">
                      <dt>{content.creditCard.closes}</dt>
                      <dd className="whitespace-nowrap">
                        {formatDayLabel(formatIsoDate(status.closingDate))}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 @md:block">
                      <dt>{content.creditCard.dues}</dt>
                      <dd className="whitespace-nowrap">
                        {formatDayLabel(formatIsoDate(status.dueDate))}
                      </dd>
                    </div>
                  </dl>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
