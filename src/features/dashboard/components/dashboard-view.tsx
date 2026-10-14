import { content } from "@/content/es";
import { BreakdownCard } from "@/features/dashboard/components/breakdown-card";
import { CategoryDonut } from "@/features/dashboard/components/category-donut";
import { ContributionsCard } from "@/features/dashboard/components/contributions-card";
import { CreditCardsCard } from "@/features/dashboard/components/credit-cards-card";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { HeadlineCards } from "@/features/dashboard/components/headline-cards";
import { IncomeProgress } from "@/features/dashboard/components/income-progress";
import { MonthlyComparison } from "@/features/dashboard/components/monthly-comparison";
import { MonthlyTrendChart } from "@/features/dashboard/components/monthly-trend-chart";
import { PersonSummaries } from "@/features/dashboard/components/person-summaries";
import { PlanVsActual } from "@/features/dashboard/components/plan-vs-actual";
import { RecentExpenses } from "@/features/dashboard/components/recent-expenses";
import { SpendingVsIncome } from "@/features/dashboard/components/spending-vs-income";
import { UpcomingPayments } from "@/features/dashboard/components/upcoming-payments";
import { buildTransactionLabels } from "@/features/transactions/lib/labels";
import { buildCategoryShares, CATEGORY_SLICE_LIMIT } from "@/lib/calculations/category-share";
import { buildMonthSummary } from "@/lib/calculations/dashboard";
import { expensesForMonth } from "@/lib/calculations/installments";
import { percentageOf } from "@/lib/calculations/money";
import { activeOnly } from "@/lib/calculations/transactions";
import { buildMonthlyTrend } from "@/lib/calculations/trend";
import { loadDashboardData } from "@/lib/data/finance";
import { requireHouseholdContext } from "@/lib/data/household";
import type { MonthKey } from "@/lib/dates/month";
import { buildCategoryColors } from "@/lib/ui/category-colors";

interface DashboardViewProps {
  month: MonthKey;
  currentMonth: MonthKey;
}

/**
 * The month, in the order you would ask about it.
 *
 * The four figures the month is judged by come first, then how it is going
 * against the plan and where the money went, then the plan category by
 * category, then the accounts, then the movements themselves. The six-month
 * trend sits last — it is context for the month rather than the month itself.
 *
 * The session and the month's data are fetched together, not one after the
 * other: RLS already scopes every read to the caller, so the data query has no
 * need to wait for the household to be known.
 */
export async function DashboardView({ month, currentMonth }: DashboardViewProps) {
  const now = new Date();
  const [{ members, userId }, data] = await Promise.all([
    requireHouseholdContext(),
    loadDashboardData(month),
  ]);

  const summary = buildMonthSummary({
    month,
    reference: now,
    members,
    categories: data.categories,
    paymentMethods: data.paymentMethods,
    expenses: data.expenses,
    incomes: data.incomes,
    transfers: data.transfers,
    budgetTemplate: data.budgetTemplate,
    budgetOverrides: data.budgetOverrides,
    incomeTemplate: data.incomeTemplate,
    incomeTemplateAmounts: data.incomeTemplateAmounts,
    incomeOverrides: data.incomeOverrides,
  });

  const labels = buildTransactionLabels({
    categories: data.categories,
    paymentMethods: data.paymentMethods,
    members,
  });

  // Built once here so the donut and the movements table agree on which colour
  // belongs to which category.
  const categoryShares = buildCategoryShares(
    summary.categoryPlan,
    content.dashboard.otherCategories,
    CATEGORY_SLICE_LIMIT,
  );
  const categoryColors = buildCategoryColors(categoryShares);

  const me = members.find((member) => member.userId === userId);

  return (
    <div className="appear-children grid gap-6">
      <DashboardHeader
        name={me === undefined ? "" : me.displayName}
        month={month}
        currentMonth={currentMonth}
        planUsed={
          summary.expenses.planned > 0
            ? percentageOf(summary.expenses.actual, summary.expenses.planned)
            : null
        }
      />

      <HeadlineCards summary={summary} />

      <div className="appear-children grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <MonthlyComparison summary={summary} />
        <CategoryDonut shares={categoryShares} colors={categoryColors} />
      </div>

      <div className="appear-children grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <SpendingVsIncome summary={summary} />
        <PlanVsActual rows={summary.categoryPlan} />
      </div>

      <PersonSummaries people={summary.people} colors={labels.memberColors} />

      <div className="appear-children grid gap-6 lg:grid-cols-3">
        <CreditCardsCard statuses={summary.creditCards} />
        <IncomeProgress rows={summary.incomeByUser} colors={labels.memberColors} />
        <UpcomingPayments statuses={summary.creditCards} />
      </div>

      <div className="appear-children grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <RecentExpenses
          expenses={expensesForMonth(activeOnly(data.expenses), month)}
          labels={labels}
          categoryColors={categoryColors}
        />

        <div className="appear-children grid gap-6">
          <BreakdownCard breakdown={summary.breakdown} />
          <ContributionsCard rows={summary.contributions} colors={labels.memberColors} />
        </div>
      </div>

      <MonthlyTrendChart points={buildMonthlyTrend(data.expenses, data.incomes, month, 6)} />
    </div>
  );
}
