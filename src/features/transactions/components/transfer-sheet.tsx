"use client";

import { Plus } from "lucide-react";

import { ActionSheet } from "@/components/form/action-sheet";
import { TextField } from "@/components/form/field";
import { SelectField, type SelectOption } from "@/components/form/select-field";
import { Button } from "@/components/ui/button";
import { content } from "@/content/es";
import { createTransfer } from "@/features/transactions/actions";
import type { IsoDate } from "@/lib/dates/month";

interface TransferSheetProps {
  paymentMethods: readonly SelectOption[];
  members: readonly SelectOption[];
  defaultUserId: string;
  defaultDate: IsoDate;
}

/**
 * Recording a card payment or a reimbursement. Never an expense — the hint says
 * so, and the data model enforces it.
 */
export function TransferSheet({
  paymentMethods,
  members,
  defaultUserId,
  defaultDate,
}: TransferSheetProps) {
  return (
    <ActionSheet
      action={createTransfer}
      title={content.transfers.new}
      description={content.transfers.hint}
      trigger={
        <Button type="button" variant="outline">
          <Plus className="size-4" aria-hidden="true" />
          {content.transfers.new}
        </Button>
      }
    >
      {(fields) => (
        <>
          <SelectField
            label={content.transfers.from}
            options={paymentMethods}
            required
            {...fields("from_payment_method_id")}
          />

          <SelectField
            label={content.transfers.to}
            options={paymentMethods}
            required
            {...fields("to_payment_method_id")}
          />

          <TextField
            label={content.transfers.amount}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            required
            {...fields("amount")}
          />

          <TextField
            label={content.transfers.date}
            type="date"
            required
            {...fields("occurred_on", defaultDate)}
          />

          <SelectField
            label={content.expenses.paidBy}
            options={members}
            required
            {...fields("user_id", defaultUserId)}
          />

          <TextField label={content.transfers.notes} autoComplete="off" {...fields("notes")} />
        </>
      )}
    </ActionSheet>
  );
}
