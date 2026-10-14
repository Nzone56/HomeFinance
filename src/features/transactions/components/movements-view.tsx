import { content } from "@/content/es";
import { ExpenseList } from "@/features/transactions/components/expense-list";
import { ExpenseSheet } from "@/features/transactions/components/expense-sheet";
import { MovementsTabs } from "@/features/transactions/components/movements-tabs";
import { TransferList } from "@/features/transactions/components/transfer-list";
import { TransferSheet } from "@/features/transactions/components/transfer-sheet";
import { buildTransactionLabels } from "@/features/transactions/lib/labels";
import {
  categoryOptions,
  memberOptions,
  paymentMethodOptions,
} from "@/features/transactions/lib/options";
import { expensesForMonth } from "@/lib/calculations/installments";
import { filterByMonth } from "@/lib/calculations/transactions";
import { loadMovementsData } from "@/lib/data/finance";
import { requireHouseholdContext } from "@/lib/data/household";
import { formatIsoDate, type MonthKey } from "@/lib/dates/month";
import { formatMonthLabel } from "@/lib/format/date";

/**
 * The month's spending and transfers. The session and the data are fetched
 * together — RLS scopes the data, so it need not wait for the household.
 */
export async function MovementsView({ month }: { month: MonthKey }) {
  const [{ members, userId }, data] = await Promise.all([
    requireHouseholdContext(),
    loadMovementsData(month),
  ]);

  const labels = buildTransactionLabels({
    categories: data.categories,
    paymentMethods: data.paymentMethods,
    members,
  });
  const methodChoices = paymentMethodOptions(data.paymentMethods, labels.members);
  const peopleChoices = memberOptions(members);
  const today = formatIsoDate(new Date());

  return (
    <div className="appear-children grid gap-4">
      <h1 className="text-xl font-semibold">
        {content.expenses.title}
        <span className="text-muted-foreground ml-2 text-sm font-normal">
          {formatMonthLabel(month)}
        </span>
      </h1>

      <MovementsTabs
        expenses={
          <>
            <div className="flex justify-end">
              <ExpenseSheet
                categories={categoryOptions(data.categories)}
                paymentMethods={methodChoices}
                members={peopleChoices}
                defaultUserId={userId}
                defaultDate={today}
              />
            </div>
            <ExpenseList
              expenses={expensesForMonth(data.expenses, month)}
              labels={labels}
              categories={categoryOptions(data.categories)}
              paymentMethods={methodChoices}
              members={peopleChoices}
              defaultUserId={userId}
              defaultDate={today}
            />
          </>
        }
        transfers={
          <>
            <div className="flex justify-end">
              <TransferSheet
                paymentMethods={methodChoices}
                members={peopleChoices}
                defaultUserId={userId}
                defaultDate={today}
              />
            </div>
            <TransferList transfers={filterByMonth(data.transfers, month)} labels={labels} />
          </>
        }
      />
    </div>
  );
}
