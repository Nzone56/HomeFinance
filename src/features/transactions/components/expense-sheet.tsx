"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { ActionSheet } from "@/components/form/action-sheet";
import { TextField } from "@/components/form/field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { Button } from "@/components/ui/button";
import { content } from "@/content/es";
import { createExpense, updateExpense } from "@/features/transactions/actions";
import type { PaymentMethodChoice } from "@/features/transactions/lib/options";
import type { MonthExpense } from "@/lib/calculations/installments";
import type { IsoDate } from "@/lib/dates/month";
import { NO_SELECTION, type SelectOption } from "@/lib/ui/select-option";

interface ExpenseSheetProps {
  categories: readonly SelectOption[];
  paymentMethods: readonly PaymentMethodChoice[];
  members: readonly SelectOption[];
  /** The signed-in user: whoever is typing usually paid. */
  defaultUserId: string;
  /** Today, resolved on the server so the field does not shift on hydration. */
  defaultDate: IsoDate;
  /** Given, the sheet edits that expense instead of creating a new one. */
  expense?: MonthExpense;
}

/** How often a bill comes back. Covers rent, subscriptions and utilities. */
const REPEAT_CHOICES: SelectOption[] = [
  { value: NO_SELECTION, label: content.expenses.repeatNever },
  { value: "1", label: content.expenses.repeatMonthly },
  { value: "2", label: content.expenses.repeatBimonthly },
  { value: "3", label: content.expenses.repeatQuarterly },
  { value: "6", label: content.expenses.repeatBiannual },
  { value: "12", label: content.expenses.repeatYearly },
];

/** A stored value, or nothing for a blank form. */
const startingValue = (expense: MonthExpense | undefined, read: (row: MonthExpense) => string) =>
  expense === undefined ? undefined : read(expense);

/**
 * The %EA to start from: whatever the purchase already carries, else whatever
 * the card offers. A card with no rate of its own leaves the field empty, which
 * means no interest.
 */
function startingRate(
  expense: MonthExpense | undefined,
  card: PaymentMethodChoice,
): string | undefined {
  const rate = expense?.annual_rate_percent ?? card.defaultRatePercent;
  return rate === null || rate === undefined ? undefined : String(rate);
}

export function ExpenseSheet({
  categories,
  paymentMethods,
  members,
  defaultUserId,
  defaultDate,
  expense,
}: ExpenseSheetProps) {
  const isEditing = expense !== undefined;

  // The stored method is the starting point when editing, so the card-only
  // fields below appear straight away rather than after the first change.
  const [methodId, setMethodId] = useState<string | undefined>(
    startingValue(expense, (row) => row.payment_method_id),
  );

  // Tracked so the split only asks for a percentage when there is something to
  // split. A new expense starts shared, which is the common case.
  const [shared, setShared] = useState(expense === undefined ? true : expense.shared);

  const startingInstallments = startingValue(expense, (row) => String(row.installments)) ?? "1";
  // Tracked so the %EA only appears once there is interest to charge: a purchase
  // paid in one cuota has none, and a rate on it is refused on save.
  const [installments, setInstallments] = useState(startingInstallments);
  const inCuotas = Number(installments.trim()) > 1;

  const method = paymentMethods.find((choice) => choice.value === methodId);
  // Narrowed once, so the card fields below never have to re-check it.
  const creditCard = method !== undefined && method.isCreditCard ? method : undefined;
  const isCreditCard = creditCard !== undefined;

  return (
    <ActionSheet
      action={isEditing ? updateExpense : createExpense}
      title={isEditing ? content.expenses.edit : content.expenses.new}
      trigger={
        isEditing ? (
          <Button type="button" variant="ghost" size="icon" aria-label={content.expenses.edit}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button">
            <Plus className="size-4" aria-hidden="true" />
            {content.expenses.new}
          </Button>
        )
      }
    >
      {(fields) => (
        <>
          {/* The row to write to. The household is never in the form — it comes
              from the session, and RLS refuses anything else. */}
          {expense === undefined ? null : <input type="hidden" name="id" value={expense.id} />}

          <TextField
            label={content.expenses.description}
            placeholder={content.expenses.descriptionPlaceholder}
            autoComplete="off"
            required
            {...fields(
              "description",
              startingValue(expense, (row) => row.description),
            )}
          />

          <TextField
            label={content.expenses.amount}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            required
            {...fields(
              "amount",
              // The full amount, not this month's share: editing a bill that
              // covers two months should show what the bill was.
              startingValue(expense, (row) => String(row.fullAmount)),
            )}
          />

          <TextField
            label={content.expenses.date}
            type="date"
            required
            {...fields(
              "occurred_on",
              startingValue(expense, (row) => row.occurred_on) ?? defaultDate,
            )}
          />

          <SelectField
            label={content.expenses.category}
            options={categories}
            required
            {...fields(
              "category_id",
              startingValue(expense, (row) => row.category_id),
            )}
          />

          <SelectField
            label={content.expenses.paymentMethod}
            options={paymentMethods}
            required
            value={methodId}
            onValueChange={setMethodId}
            {...fields(
              "payment_method_id",
              startingValue(expense, (row) => row.payment_method_id),
            )}
          />

          <SelectField
            label={content.expenses.paidBy}
            options={members}
            required
            {...fields("user_id", startingValue(expense, (row) => row.user_id) ?? defaultUserId)}
          />

          <TextField
            label={isCreditCard ? content.expenses.installments : content.expenses.coversMonths}
            hint={
              isCreditCard ? content.expenses.installmentsHint : content.expenses.coversMonthsHint
            }
            inputMode="numeric"
            autoComplete="off"
            onChange={(event) => setInstallments(event.target.value)}
            {...fields("installments", startingInstallments)}
          />

          {creditCard !== undefined && inCuotas ? (
            <TextField
              label={content.expenses.annualRate}
              hint={content.expenses.annualRateHint}
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              // The card offers its own rate as the starting point; a card with
              // none leaves the field empty, which means no interest.
              {...fields("annual_rate_percent", startingRate(expense, creditCard))}
            />
          ) : null}

          <SelectField
            label={content.expenses.repeat}
            hint={content.expenses.repeatHint}
            options={REPEAT_CHOICES}
            {...fields(
              "repeat_months",
              expense?.repeat_months == null ? NO_SELECTION : String(expense.repeat_months),
            )}
          />

          <TextField
            label={content.expenses.repeatUntil}
            hint={content.expenses.repeatUntilHint}
            type="date"
            {...fields(
              "repeat_until",
              startingValue(expense, (row) => row.repeat_until ?? ""),
            )}
          />

          <SwitchField
            label={content.expenses.shared}
            name="shared"
            hint={content.expenses.sharedHint}
            defaultChecked={fields.isChecked(
              "shared",
              expense === undefined ? true : expense.shared,
            )}
            onCheckedChange={setShared}
          />

          {shared ? (
            <TextField
              label={content.expenses.payerShare}
              hint={content.expenses.payerShareHint}
              inputMode="numeric"
              autoComplete="off"
              placeholder="50"
              {...fields(
                "payer_share_percent",
                startingValue(expense, (row) => String(row.payer_share_percent)) ?? "50",
              )}
            />
          ) : null}

          <TextField
            label={content.expenses.notes}
            autoComplete="off"
            {...fields(
              "notes",
              startingValue(expense, (row) => row.notes ?? ""),
            )}
          />
        </>
      )}
    </ActionSheet>
  );
}
