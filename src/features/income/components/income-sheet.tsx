"use client";

import { Plus } from "lucide-react";

import { ActionSheet } from "@/components/form/action-sheet";
import { TextField } from "@/components/form/field";
import { SelectField } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { content } from "@/content/es";
import { createIncome } from "@/features/transactions/actions";
import type { IsoDate } from "@/lib/dates/month";
import { NO_SELECTION, type SelectOption } from "@/lib/ui/select-option";

interface IncomeSheetProps {
  paymentMethods: readonly SelectOption[];
  members: readonly SelectOption[];
  defaultUserId: string;
  defaultDate: IsoDate;
}

export function IncomeSheet({
  paymentMethods,
  members,
  defaultUserId,
  defaultDate,
}: IncomeSheetProps) {
  // Cash income need not land in a tracked account, so the account is optional.
  const accountChoices: SelectOption[] = [
    { value: NO_SELECTION, label: content.income.noAccount },
    ...paymentMethods,
  ];

  return (
    <ActionSheet
      action={createIncome}
      title={content.income.new}
      trigger={
        <Button type="button">
          <Plus className="size-4" aria-hidden="true" />
          {content.income.new}
        </Button>
      }
    >
      {(fields) => (
        <>
          <TextField
            label={content.income.label}
            placeholder={content.income.labelPlaceholder}
            autoComplete="off"
            required
            {...fields("label")}
          />

          <TextField
            label={content.income.amount}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            required
            {...fields("amount")}
          />

          <TextField
            label={content.income.date}
            type="date"
            required
            {...fields("occurred_on", defaultDate)}
          />

          <SelectField
            label={content.income.receivedBy}
            options={members}
            required
            {...fields("user_id", defaultUserId)}
          />

          <SelectField
            label={content.income.account}
            options={accountChoices}
            {...fields("payment_method_id", NO_SELECTION)}
          />

          <TextField label={content.income.notes} autoComplete="off" {...fields("notes")} />
        </>
      )}
    </ActionSheet>
  );
}
