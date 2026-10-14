import { Amount } from "@/components/money/amount";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content, payerWithMethod } from "@/content/es";
import { labelFor } from "@/features/transactions/lib/labels";
import { paymentMethodOptions } from "@/features/transactions/lib/options";
import { incomeBaseline } from "@/lib/calculations/income";
import type { MonthKey } from "@/lib/dates/month";
import type { SelectOption } from "@/lib/ui/select-option";
import type {
  CategoryRow,
  IncomeTemplateAmountRow,
  IncomeTemplateItemRow,
  PaymentMethodRow,
} from "@/types/database";

import { CategorySheet } from "./category-sheet";
import { IncomeSourceSheet } from "./income-source-sheet";
import { PaymentMethodSheet } from "./payment-method-sheet";

function Section({
  title,
  action,
  isEmpty,
  emptyMessage,
  children,
}: {
  title: string;
  action: React.ReactNode;
  isEmpty: boolean;
  emptyMessage: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-muted-foreground text-sm">{emptyMessage}</p>
        ) : (
          <ul className="appear-children divide-y">{children}</ul>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  title,
  subtitle,
  badge,
  trailing,
  action,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  trailing?: React.ReactNode;
  action: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-3 py-2.5">
      <div className="grid min-w-0 flex-1 gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{title}</span>
          {badge !== undefined ? (
            <Badge variant="outline" className="font-normal">
              {badge}
            </Badge>
          ) : null}
        </div>
        <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
      </div>
      {trailing}
      {action}
    </li>
  );
}

interface ReferenceDataProps {
  paymentMethods: readonly PaymentMethodRow[];
  categories: readonly CategoryRow[];
  incomeSources: readonly IncomeTemplateItemRow[];
  /** Dated changes to what each source brings. */
  incomeAmounts: readonly IncomeTemplateAmountRow[];
  /** The month a source's amount is shown and edited for. */
  currentMonth: MonthKey;
  memberOptions: readonly SelectOption[];
  memberNames: ReadonlyMap<string, string>;
  currentUserId: string;
}

/** The household's own vocabulary: how it pays, what it spends on, what comes in. */
export function ReferenceData({
  paymentMethods,
  categories,
  incomeSources,
  incomeAmounts,
  currentMonth,
  memberOptions,
  memberNames,
  currentUserId,
}: ReferenceDataProps) {
  const nextSortOrder =
    categories.reduce((highest, category) => Math.max(highest, category.sort_order), 0) + 10;
  // Income lands in an account, never on a credit card.
  const accounts = paymentMethodOptions(paymentMethods, memberNames).filter(
    (option) => !option.isCreditCard,
  );
  // Each source as it stands from this month on, which is what an edit changes.
  const currentSources = incomeSources.map((source) => ({
    ...source,
    amount: incomeBaseline(source, incomeAmounts, currentMonth),
  }));

  return (
    <div className="appear-children grid gap-4">
      <Section
        title={content.settings.paymentMethods}
        action={<PaymentMethodSheet members={memberOptions} />}
        isEmpty={paymentMethods.length === 0}
        emptyMessage={content.settings.paymentMethodsEmpty}
      >
        {paymentMethods.map((method) => (
          <Row
            key={method.id}
            title={method.name}
            subtitle={`${content.paymentMethodType[method.type]} · ${labelFor(memberNames, method.user_id, "—")}`}
            badge={method.active ? undefined : content.settings.methodInactive}
            trailing={
              method.credit_limit === null ? null : (
                <Amount value={method.credit_limit} tone="muted" className="text-xs" />
              )
            }
            action={<PaymentMethodSheet members={memberOptions} method={method} />}
          />
        ))}
      </Section>

      <Section
        title={content.settings.categories}
        action={<CategorySheet nextSortOrder={nextSortOrder} />}
        isEmpty={categories.length === 0}
        emptyMessage={content.settings.categoriesEmpty}
      >
        {categories.map((category) => (
          <Row
            key={category.id}
            title={category.name}
            subtitle={`#${category.sort_order}`}
            badge={category.archived ? content.settings.categoryArchived : undefined}
            action={<CategorySheet category={category} nextSortOrder={nextSortOrder} />}
          />
        ))}
      </Section>

      <Section
        title={content.settings.incomeSources}
        action={
          <IncomeSourceSheet
            members={memberOptions}
            accounts={accounts}
            defaultUserId={currentUserId}
          />
        }
        isEmpty={currentSources.length === 0}
        emptyMessage={content.settings.incomeSourcesEmpty}
      >
        {currentSources.map((source) => (
          <Row
            key={source.id}
            title={source.label}
            subtitle={payerWithMethod(
              labelFor(memberNames, source.user_id, "—"),
              labelFor(
                new Map(accounts.map((account) => [account.value, account.label])),
                source.payment_method_id,
                content.income.noAccount,
              ),
            )}
            badge={source.active ? undefined : content.settings.incomeSourceInactive}
            trailing={<Amount value={source.amount} tone="muted" className="text-xs" />}
            action={
              <IncomeSourceSheet
                members={memberOptions}
                accounts={accounts}
                source={source}
                defaultUserId={currentUserId}
              />
            }
          />
        ))}
      </Section>
    </div>
  );
}
