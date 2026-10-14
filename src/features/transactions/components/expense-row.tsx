"use client";

import { ChevronDown, Repeat } from "lucide-react";
import { useId, useState } from "react";

import { ConfirmDeleteButton } from "@/components/form/confirm-delete-button";
import { Amount } from "@/components/money/amount";
import { MemberAvatar } from "@/components/people/member-avatar";
import { Badge } from "@/components/ui/badge";
import {
  content,
  installmentLabel,
  ratePercent,
  repeatEvery,
  splitSummary,
  spreadLabel,
} from "@/content/es";
import { deleteExpense } from "@/features/transactions/actions";
import { ExpenseActiveToggle } from "@/features/transactions/components/expense-active-toggle";
import { ExpenseSheet } from "@/features/transactions/components/expense-sheet";
import { labelFor, type TransactionLabels } from "@/features/transactions/lib/labels";
import type { PaymentMethodChoice } from "@/features/transactions/lib/options";
import type { MonthExpense } from "@/lib/calculations/installments";
import type { IsoDate } from "@/lib/dates/month";
import { formatDayLabel, formatFullDate } from "@/lib/format/date";
import { memberColor } from "@/lib/ui/member-colors";
import type { SelectOption } from "@/lib/ui/select-option";
import { cn } from "@/lib/utils";

interface ExpenseRowProps {
  expense: MonthExpense;
  labels: TransactionLabels;
  categories: readonly SelectOption[];
  paymentMethods: readonly PaymentMethodChoice[];
  members: readonly SelectOption[];
  defaultUserId: string;
  defaultDate: IsoDate;
}

function DetailRow({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="text-muted-foreground">{term}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}

/**
 * One expense, with everything it knows one click away.
 *
 * The row itself carries only what you scan a list for; the rest — notes, the
 * cuotas, the %EA, how often it comes back — lives in a panel underneath, so a
 * water bill that arrives every two months can explain itself without every
 * other row paying for the space.
 */
export function ExpenseRow({
  expense,
  labels,
  categories,
  paymentMethods,
  members,
  defaultUserId,
  defaultDate,
}: ExpenseRowProps) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();

  const isSpread = expense.installmentCount > 1;
  const payer = labelFor(labels.members, expense.user_id, "—");

  // The payer's part, then whoever else shares it dividing the rest.
  const others = members.filter((member) => member.value !== expense.user_id);
  const splitParts = [
    { name: payer, percent: expense.payer_share_percent },
    ...others.map((member) => ({
      name: member.label,
      percent: Math.round((100 - expense.payer_share_percent) / others.length),
    })),
  ];

  return (
    <li className="grid">
      <div className="flex items-center gap-2 px-4 py-3 sm:gap-3">
        <ExpenseActiveToggle id={expense.id} active={expense.active} />

        {/* Labelled: the payer's name is no longer in the row text beside it,
            so the mark stands alone and has to say who it is. */}
        <MemberAvatar
          name={payer}
          color={memberColor(labels.memberColors, expense.user_id)}
          labelled
          className={cn(!expense.active && "opacity-50")}
        />

        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "grid min-w-0 flex-1 gap-0.5 text-left",
            // An excluded expense is still readable, just visibly out of play.
            !expense.active && "opacity-50",
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("truncate text-sm font-medium", !expense.active && "line-through")}>
              {expense.description}
            </span>
            {expense.active ? null : (
              <Badge variant="secondary" className="shrink-0 font-normal">
                {content.expenses.excluded}
              </Badge>
            )}
            {expense.shared ? null : (
              <Badge variant="outline" className="shrink-0 font-normal">
                {content.expenses.personal}
              </Badge>
            )}
            {isSpread ? (
              <Badge variant="secondary" className="shrink-0 font-normal">
                {expense.hasInterest
                  ? installmentLabel(expense.installmentIndex, expense.installmentCount)
                  : spreadLabel(expense.installmentCount)}
              </Badge>
            ) : null}
            {expense.repeat_months === null ? null : (
              <Badge variant="outline" className="shrink-0 font-normal">
                <Repeat className="size-3" aria-hidden="true" />
              </Badge>
            )}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 truncate text-xs">
            {labelFor(labels.categories, expense.category_id, "—")}
            {" · "}
            {labelFor(labels.methods, expense.payment_method_id, "—")}
            <ChevronDown
              aria-hidden="true"
              className={cn("size-3 shrink-0 transition-transform", expanded && "rotate-180")}
            />
          </span>
        </button>

        <div
          className={cn(
            "grid justify-items-end gap-0.5 whitespace-nowrap",
            !expense.active && "opacity-50",
          )}
        >
          <Amount value={expense.amount} className="text-sm" />
          <span className="text-muted-foreground text-xs">
            {formatDayLabel(expense.occurred_on)}
          </span>
        </div>

        <ExpenseSheet
          categories={categories}
          paymentMethods={paymentMethods}
          members={members}
          defaultUserId={defaultUserId}
          defaultDate={defaultDate}
          expense={expense}
        />

        <ConfirmDeleteButton
          action={deleteExpense}
          id={expense.id}
          label={content.a11y.deleteExpense}
          confirmMessage={content.expenses.confirmDelete}
        />
      </div>

      {expanded ? (
        <dl id={detailsId} className="bg-muted/40 grid gap-0 px-4 py-3 text-xs">
          <DetailRow term={content.expenses.date}>{formatFullDate(expense.occurred_on)}</DetailRow>
          <DetailRow term={content.expenses.paidBy}>{payer}</DetailRow>
          <DetailRow term={content.expenses.category}>
            {labelFor(labels.categories, expense.category_id, "—")}
          </DetailRow>
          <DetailRow term={content.expenses.paymentMethod}>
            {labelFor(labels.methods, expense.payment_method_id, "—")}
          </DetailRow>
          <DetailRow term={content.expenses.shared}>
            {expense.shared ? content.common.yes : content.common.no}
          </DetailRow>
          {expense.shared ? (
            <DetailRow term={content.expenses.split}>{splitSummary(splitParts)}</DetailRow>
          ) : null}

          {isSpread ? (
            <>
              <DetailRow term={content.expenses.totalAmount}>
                <Amount value={expense.fullAmount} className="text-xs" />
              </DetailRow>
              <DetailRow term={content.expenses.thisMonth}>
                <Amount value={expense.amount} className="text-xs" />
              </DetailRow>
              <DetailRow term={content.expenses.installments}>
                {installmentLabel(expense.installmentIndex, expense.installmentCount)}
              </DetailRow>
            </>
          ) : null}

          {expense.annual_rate_percent === null ? null : (
            <DetailRow term={content.expenses.annualRate}>
              {ratePercent(expense.annual_rate_percent)}
            </DetailRow>
          )}

          {expense.repeat_months === null ? null : (
            <DetailRow term={content.expenses.repeat}>
              {repeatEvery(expense.repeat_months)}
            </DetailRow>
          )}

          {expense.repeat_until === null ? null : (
            <DetailRow term={content.expenses.repeatUntil}>
              {formatFullDate(expense.repeat_until)}
            </DetailRow>
          )}

          {expense.notes === null ? null : (
            <DetailRow term={content.expenses.notes}>{expense.notes}</DetailRow>
          )}
        </dl>
      ) : null}
    </li>
  );
}
