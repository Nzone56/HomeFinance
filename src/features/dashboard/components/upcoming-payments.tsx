import { CreditCard } from "lucide-react";

import { Amount } from "@/components/money/amount";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { closedStatementDue, content, openCycleDue } from "@/content/es";
import type { CreditCardStatus } from "@/lib/calculations/credit-cards";
import { formatIsoDate } from "@/lib/dates/month";
import { formatDayLabel } from "@/lib/format/date";

interface PaymentRow {
  key: string;
  cardName: string;
  dueDate: Date;
  detail: string;
  amount: number;
  overdue: boolean;
}

const dayOf = (date: Date) => formatDayLabel(formatIsoDate(date));

/**
 * A card's open bills: the statement that already closed while any of it is
 * unpaid, then the cycle building up now. Each has its own due date.
 */
function paymentRows(status: CreditCardStatus): PaymentRow[] {
  const cycle: PaymentRow = {
    key: `${status.card.id}-cycle`,
    cardName: status.card.name,
    dueDate: status.dueDate,
    detail: openCycleDue(dayOf(status.dueDate), dayOf(status.closingDate)),
    amount: status.cycleOwed,
    overdue: false,
  };

  if (status.statement.unpaid === 0) {
    return [cycle];
  }

  const { statement } = status;
  return [
    {
      key: `${status.card.id}-statement`,
      cardName: status.card.name,
      dueDate: statement.dueDate,
      detail: closedStatementDue(dayOf(statement.dueDate), dayOf(statement.closingDate)),
      amount: statement.unpaid,
      overdue: statement.overdue,
    },
    cycle,
  ];
}

/**
 * What each card wants paid, and when.
 *
 * Sorted by due date rather than by size: the question this answers is what
 * lands next, not what costs most. A statement that has closed and the cycle
 * after it are separate rows — the debt used to sit entirely against the later
 * date, pushing a bill due in three weeks two months out.
 */
export function UpcomingPayments({ statuses }: { statuses: readonly CreditCardStatus[] }) {
  const rows = statuses
    .flatMap(paymentRows)
    .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{content.dashboard.upcomingPayments}</CardTitle>
      </CardHeader>

      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">{content.dashboard.upcomingPaymentsEmpty}</p>
        ) : (
          <ul className="appear-children divide-y">
            {rows.map((row) => (
              <li key={row.key} className="flex items-center gap-3 py-2.5 first:pt-0">
                <span
                  aria-hidden="true"
                  className="bg-muted grid size-9 shrink-0 place-items-center rounded-lg"
                >
                  <CreditCard className="text-muted-foreground size-4" />
                </span>

                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium">{row.cardName}</span>
                  <span className="text-muted-foreground truncate text-xs">{row.detail}</span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {row.overdue ? (
                    <Badge variant="destructive">{content.creditCard.overdue}</Badge>
                  ) : null}
                  <Amount value={row.amount} className="text-sm whitespace-nowrap" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
