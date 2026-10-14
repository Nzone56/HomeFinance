import { content } from "@/content/es";
import { ExpectedIncomeList } from "@/features/income/components/expected-income-list";
import { ExpectedVsActual } from "@/features/income/components/expected-vs-actual";
import { IncomeList } from "@/features/income/components/income-list";
import { IncomeSheet } from "@/features/income/components/income-sheet";
import { buildTransactionLabels } from "@/features/transactions/lib/labels";
import { memberOptions, paymentMethodOptions } from "@/features/transactions/lib/options";
import {
  buildIncomeByUser,
  receivedTemplateItemIds,
  resolveExpectedIncome,
} from "@/lib/calculations/income";
import { filterByMonth, totalsBy } from "@/lib/calculations/transactions";
import { loadIncomePageData } from "@/lib/data/finance";
import { requireHouseholdContext } from "@/lib/data/household";
import { currentMonthKey, formatIsoDate, type MonthKey } from "@/lib/dates/month";
import { formatMonthLabel } from "@/lib/format/date";

/**
 * What arrived against what was expected. The session and the data are fetched
 * together — RLS scopes the data, so it need not wait for the household.
 */
export async function IncomeView({ month }: { month: MonthKey }) {
  const [{ members, userId }, data] = await Promise.all([
    requireHouseholdContext(),
    loadIncomePageData(month),
  ]);

  const now = new Date();
  const monthIncomes = filterByMonth(data.incomes, month);
  const expectedRows = resolveExpectedIncome(
    data.incomeTemplate,
    data.incomeTemplateAmounts,
    data.incomeOverrides,
    month,
  );
  const byUser = buildIncomeByUser(
    members,
    expectedRows,
    totalsBy(monthIncomes, (income) => income.user_id),
  );

  const labels = buildTransactionLabels({ paymentMethods: data.paymentMethods, members });
  // Income arrives in accounts, never on a credit card.
  const accounts = paymentMethodOptions(data.paymentMethods, labels.members).filter(
    (option) => !option.isCreditCard,
  );

  return (
    <div className="appear-children grid gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">
          {content.income.title}
          <span className="text-muted-foreground ml-2 text-sm font-normal">
            {formatMonthLabel(month)}
          </span>
        </h1>

        <IncomeSheet
          paymentMethods={accounts}
          members={memberOptions(members)}
          defaultUserId={userId}
          defaultDate={formatIsoDate(now)}
        />
      </div>

      <ExpectedVsActual rows={byUser} colors={labels.memberColors} />
      <ExpectedIncomeList
        rows={expectedRows}
        receivedIds={receivedTemplateItemIds(monthIncomes, month)}
        month={month}
        canReceive={month <= currentMonthKey(now)}
        labels={labels}
      />
      <IncomeList incomes={monthIncomes} labels={labels} />
    </div>
  );
}
