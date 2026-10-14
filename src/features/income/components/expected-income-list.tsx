import { Amount } from "@/components/money/amount";
import { MemberAvatar } from "@/components/people/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content, payerWithMethod } from "@/content/es";
import { labelFor, type TransactionLabels } from "@/features/transactions/lib/labels";
import type { ExpectedIncomeRow } from "@/lib/calculations/income";
import type { MonthKey } from "@/lib/dates/month";
import { memberColor } from "@/lib/ui/member-colors";

import { ReceiveIncomeButton } from "./receive-income-button";

interface ExpectedIncomeListProps {
  rows: readonly ExpectedIncomeRow[];
  /** Sources already recorded as received this month. */
  receivedIds: ReadonlySet<string>;
  month: MonthKey;
  /** False for a month still ahead: nothing can have arrived yet. */
  canReceive: boolean;
  labels: TransactionLabels;
}

function Status({
  row,
  receivedIds,
  month,
  canReceive,
}: Omit<ExpectedIncomeListProps, "rows" | "labels"> & { row: ExpectedIncomeRow }) {
  if (receivedIds.has(row.templateItemId)) {
    return (
      <Badge variant="secondary" className="shrink-0 font-normal">
        {content.income.received}
      </Badge>
    );
  }
  if (!canReceive) {
    return (
      <Badge variant="outline" className="shrink-0 font-normal">
        {content.income.notYet}
      </Badge>
    );
  }
  return <ReceiveIncomeButton month={month} templateItemId={row.templateItemId} />;
}

/**
 * What the plan says should arrive this month, and whether it has.
 *
 * The plan alone never counts as money received — the dashboard's "real" column
 * is only what was recorded. This is the bridge between the two: each expected
 * income is one click from being recorded with its amount and its account.
 */
export function ExpectedIncomeList({
  rows,
  receivedIds,
  month,
  canReceive,
  labels,
}: ExpectedIncomeListProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{content.income.expectedTitle}</CardTitle>
      </CardHeader>

      <CardContent className="p-0">
        <ul className="appear-children divide-y">
          {rows.map((row) => {
            const member = labelFor(labels.members, row.userId, "—");

            return (
              <li key={row.templateItemId} className="flex items-center gap-3 px-4 py-3">
                <MemberAvatar name={member} color={memberColor(labels.memberColors, row.userId)} />

                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-medium">{row.label}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {payerWithMethod(
                      member,
                      labelFor(labels.methods, row.paymentMethodId, content.income.noAccount),
                    )}
                  </span>
                </div>

                <Amount value={row.amount} className="text-sm whitespace-nowrap" />

                <Status row={row} receivedIds={receivedIds} month={month} canReceive={canReceive} />
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
