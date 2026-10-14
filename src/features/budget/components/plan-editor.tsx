import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content, recurringNote } from "@/content/es";
import {
  resetBudgetMonthOverride,
  resetIncomeMonthOverride,
  saveBudgetMonthOverride,
  saveBudgetTemplateItem,
  saveIncomeMonthOverride,
  saveIncomeTemplateAmount,
} from "@/features/budget/actions";
import { labelFor } from "@/features/transactions/lib/labels";
import type { ExpectedIncomeRow } from "@/lib/calculations/income";
import { amountFor } from "@/lib/calculations/transactions";
import type { MonthKey } from "@/lib/dates/month";
import { formatCop } from "@/lib/format/currency";
import type { CategoryRow, IncomeTemplateItemRow } from "@/types/database";

import { AmountRowForm } from "./amount-row-form";

interface PlanEditorProps {
  /**
   * `template` edits the global baseline every month inherits; `month` edits a
   * single month's departure from it, leaving the template untouched.
   */
  mode: "template" | "month";
  month: MonthKey;
  categories: readonly CategoryRow[];
  /** Template amounts in template mode; resolved amounts in month mode. */
  plannedByCategory: ReadonlyMap<string, number>;
  /**
   * What each category's repeating expenses plan on their own. Shown beside the
   * typed amount, which is only what is planned on top of them.
   */
  recurringByCategory: ReadonlyMap<string, number>;
  overriddenCategories: ReadonlySet<string>;
  incomeItems: readonly IncomeTemplateItemRow[];
  /** Each source's amount from the current month onward — what the template edits. */
  incomeBaselines: ReadonlyMap<string, number>;
  /** The month's expected income: only sources that have started, as resolved. */
  expectedIncome: readonly ExpectedIncomeRow[];
  memberNames: ReadonlyMap<string, string>;
}

interface IncomePlanRow {
  id: string;
  label: string;
  userId: string;
  amount: number;
  isOverridden: boolean;
}

function Section({
  title,
  children,
  isEmpty,
  emptyMessage,
}: {
  title: string;
  children: React.ReactNode;
  isEmpty: boolean;
  emptyMessage: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          <ul className="divide-y">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

/** In month mode each row says whether it follows the template or departs from it. */
function planBadge(isMonth: boolean, isOverridden: boolean): string | undefined {
  if (!isMonth) {
    return undefined;
  }
  return isOverridden ? content.budget.overridden : content.budget.usesTemplate;
}

export function PlanEditor({
  mode,
  month,
  categories,
  plannedByCategory,
  recurringByCategory,
  overriddenCategories,
  incomeItems,
  incomeBaselines,
  expectedIncome,
  memberNames,
}: PlanEditorProps) {
  const isMonth = mode === "month";
  const activeCategories = categories.filter((category) => !category.archived);

  // A month lists only the sources expected in it — one created in September
  // has nothing to adjust in August. The template lists every source.
  const incomeRows: IncomePlanRow[] = isMonth
    ? expectedIncome.map((row) => ({
        id: row.templateItemId,
        label: row.label,
        userId: row.userId,
        amount: row.amount,
        isOverridden: row.isOverridden,
      }))
    : incomeItems.map((item) => ({
        id: item.id,
        label: item.label,
        userId: item.user_id,
        amount: amountFor(incomeBaselines, item.id),
        isOverridden: false,
      }));

  return (
    <div className="grid gap-4">
      <p className="text-muted-foreground text-sm">
        {isMonth ? content.budget.monthHint : content.budget.templateHint}
      </p>

      <Section
        title={content.budget.expenseSection}
        isEmpty={activeCategories.length === 0}
        emptyMessage={content.settings.categoriesEmpty}
      >
        {activeCategories.map((category) => {
          const isOverridden = overriddenCategories.has(category.id);
          const recurring = amountFor(recurringByCategory, category.id);

          return (
            <AmountRowForm
              key={category.id}
              action={isMonth ? saveBudgetMonthOverride : saveBudgetTemplateItem}
              label={category.name}
              amount={amountFor(plannedByCategory, category.id)}
              note={recurring > 0 ? recurringNote(formatCop(recurring)) : undefined}
              hidden={isMonth ? { month, category_id: category.id } : { category_id: category.id }}
              badge={planBadge(isMonth, isOverridden)}
              reset={
                isMonth && isOverridden
                  ? {
                      action: resetBudgetMonthOverride,
                      hidden: { month, category_id: category.id },
                    }
                  : undefined
              }
            />
          );
        })}
      </Section>

      <Section
        title={content.budget.incomeSection}
        isEmpty={incomeRows.length === 0}
        emptyMessage={content.budget.incomeEmpty}
      >
        {incomeRows.map((row) => (
          <AmountRowForm
            key={row.id}
            action={isMonth ? saveIncomeMonthOverride : saveIncomeTemplateAmount}
            label={`${row.label} · ${labelFor(memberNames, row.userId, "—")}`}
            amount={row.amount}
            hidden={isMonth ? { month, template_item_id: row.id } : { template_item_id: row.id }}
            badge={planBadge(isMonth, row.isOverridden)}
            reset={
              isMonth && row.isOverridden
                ? {
                    action: resetIncomeMonthOverride,
                    hidden: { month, template_item_id: row.id },
                  }
                : undefined
            }
          />
        ))}
      </Section>
    </div>
  );
}
