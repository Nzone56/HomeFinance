import { content } from "@/content/es";
import { PlanEditor } from "@/features/budget/components/plan-editor";
import { PlanTabs } from "@/features/budget/components/plan-tabs";
import { buildTransactionLabels } from "@/features/transactions/lib/labels";
import {
  overriddenCategoryIds,
  recurringByCategory,
  resolvePlannedByCategory,
} from "@/lib/calculations/budget";
import { incomeBaseline, resolveExpectedIncome } from "@/lib/calculations/income";
import { loadPlanData } from "@/lib/data/finance";
import { requireHouseholdContext } from "@/lib/data/household";
import { currentMonthKey, type MonthKey } from "@/lib/dates/month";
import { formatMonthLabel } from "@/lib/format/date";

/**
 * The template and this month's adjustments to it. The session and the data are
 * fetched together — RLS scopes the data, so it need not wait for the household.
 *
 * The template tab always shows the plan as it stands from the current month
 * onward, whichever month is being browsed: that is what a template edit
 * changes, so that is what it should show.
 *
 * The month tab shows, beside each category's typed amount, what the repeating
 * expenses add to it on their own — the typed amount is only what is planned
 * on top of those.
 */
export async function PlanView({ month }: { month: MonthKey }) {
  const currentMonth = currentMonthKey(new Date());
  // The template speaks for the current month onward, so its repeating expenses
  // have to be loaded even when an earlier month is the one being browsed.
  const loadThrough = month > currentMonth ? month : currentMonth;

  const [{ members }, data] = await Promise.all([
    requireHouseholdContext(),
    loadPlanData(loadThrough),
  ]);

  const { members: memberNames } = buildTransactionLabels({ members });

  const templateAmounts = resolvePlannedByCategory(data.budgetTemplate, [], currentMonth);
  const monthAmounts = resolvePlannedByCategory(data.budgetTemplate, data.budgetOverrides, month);
  const expectedIncome = resolveExpectedIncome(
    data.incomeTemplate,
    data.incomeTemplateAmounts,
    data.incomeOverrides,
    month,
  );
  const incomeBaselines = new Map(
    data.incomeTemplate.map((item) => [
      item.id,
      incomeBaseline(item, data.incomeTemplateAmounts, currentMonth),
    ]),
  );

  return (
    <div className="appear-children grid gap-4">
      <h1 className="text-xl font-semibold">{content.budget.title}</h1>

      <PlanTabs
        monthLabel={formatMonthLabel(month)}
        month={
          <PlanEditor
            mode="month"
            month={month}
            categories={data.categories}
            plannedByCategory={monthAmounts}
            recurringByCategory={recurringByCategory(data.expenses, month)}
            overriddenCategories={overriddenCategoryIds(data.budgetOverrides, month)}
            incomeItems={data.incomeTemplate}
            incomeBaselines={incomeBaselines}
            expectedIncome={expectedIncome}
            memberNames={memberNames}
          />
        }
        template={
          <PlanEditor
            mode="template"
            month={month}
            categories={data.categories}
            plannedByCategory={templateAmounts}
            recurringByCategory={recurringByCategory(data.expenses, currentMonth)}
            overriddenCategories={new Set()}
            incomeItems={data.incomeTemplate}
            incomeBaselines={incomeBaselines}
            expectedIncome={expectedIncome}
            memberNames={memberNames}
          />
        }
      />
    </div>
  );
}
