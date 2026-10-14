import { ConfirmDeleteButton } from "@/components/form/confirm-delete-button";
import { Amount } from "@/components/money/amount";
import { MemberAvatar } from "@/components/people/member-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { content, payerWithMethod } from "@/content/es";
import { deleteIncome } from "@/features/transactions/actions";
import { labelFor, type TransactionLabels } from "@/features/transactions/lib/labels";
import { formatDayLabel } from "@/lib/format/date";
import { memberColor } from "@/lib/ui/member-colors";
import type { IncomeRow } from "@/types/database";

interface IncomeListProps {
  incomes: readonly IncomeRow[];
  labels: TransactionLabels;
}

export function IncomeList({ incomes, labels }: IncomeListProps) {
  if (incomes.length === 0) {
    return (
      <Card>
        <CardContent className="grid gap-1 py-10 text-center">
          <p className="text-sm font-medium">{content.income.empty}</p>
          <p className="text-muted-foreground text-sm">{content.income.emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="appear-children divide-y">
          {incomes.map((income) => (
            <li key={income.id} className="flex items-center gap-3 px-4 py-3">
              <MemberAvatar
                name={labelFor(labels.members, income.user_id, "—")}
                color={memberColor(labels.memberColors, income.user_id)}
              />

              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-medium">{income.label}</span>
                <span className="text-muted-foreground truncate text-xs">
                  {payerWithMethod(
                    labelFor(labels.members, income.user_id, "—"),
                    labelFor(labels.methods, income.payment_method_id, content.income.noAccount),
                  )}
                </span>
              </div>

              <div className="grid justify-items-end gap-0.5 whitespace-nowrap">
                <Amount value={income.amount} className="text-sm" />
                <span className="text-muted-foreground text-xs">
                  {formatDayLabel(income.occurred_on)}
                </span>
              </div>

              <ConfirmDeleteButton
                action={deleteIncome}
                id={income.id}
                label={content.a11y.deleteIncome}
                confirmMessage={content.income.confirmDelete}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
