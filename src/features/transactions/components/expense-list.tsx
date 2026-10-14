import { Card, CardContent } from "@/components/ui/card";
import { content } from "@/content/es";
import { ExpenseRow } from "@/features/transactions/components/expense-row";
import type { TransactionLabels } from "@/features/transactions/lib/labels";
import type { PaymentMethodChoice } from "@/features/transactions/lib/options";
import type { MonthExpense } from "@/lib/calculations/installments";
import type { IsoDate } from "@/lib/dates/month";
import type { SelectOption } from "@/lib/ui/select-option";

interface ExpenseListProps {
  /** One month's shares, so a spread bill shows what it costs *this* month. */
  expenses: readonly MonthExpense[];
  labels: TransactionLabels;
  /** Passed through to the edit form each row carries. */
  categories: readonly SelectOption[];
  paymentMethods: readonly PaymentMethodChoice[];
  members: readonly SelectOption[];
  defaultUserId: string;
  defaultDate: IsoDate;
}

export function ExpenseList({
  expenses,
  labels,
  categories,
  paymentMethods,
  members,
  defaultUserId,
  defaultDate,
}: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <Card>
        <CardContent className="grid gap-1 py-10 text-center">
          <p className="text-sm font-medium">{content.expenses.empty}</p>
          <p className="text-muted-foreground text-sm">{content.expenses.emptyHint}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <p className="text-muted-foreground border-b px-4 py-2 text-xs">
          {content.expenses.excludedHint}
        </p>
        <ul className="appear-children divide-y">
          {expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              labels={labels}
              categories={categories}
              paymentMethods={paymentMethods}
              members={members}
              defaultUserId={defaultUserId}
              defaultDate={defaultDate}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
