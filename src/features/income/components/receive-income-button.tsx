"use client";

import { useActionState } from "react";

import { ActionFeedback } from "@/components/form/action-feedback";
import { SubmitButton } from "@/components/form/submit-button";
import { content } from "@/content/es";
import { receiveExpectedIncome } from "@/features/transactions/actions";
import { IDLE_STATE } from "@/lib/actions/state";
import type { MonthKey } from "@/lib/dates/month";

interface ReceiveIncomeButtonProps {
  month: MonthKey;
  templateItemId: string;
}

/**
 * One click from "expected" to "received". The form carries only which source
 * and which month; the server copies everything else from the source itself.
 */
export function ReceiveIncomeButton({ month, templateItemId }: ReceiveIncomeButtonProps) {
  const [state, formAction] = useActionState(receiveExpectedIncome, IDLE_STATE);

  return (
    <form action={formAction}>
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="template_item_id" value={templateItemId} />
      <SubmitButton
        size="sm"
        variant="outline"
        label={content.income.markReceived}
        pendingLabel={content.income.receiving}
      />
      <ActionFeedback state={state} />
    </form>
  );
}
