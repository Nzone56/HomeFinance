"use client";

import { RotateCcw } from "lucide-react";
import { useActionState } from "react";

import { ActionFeedback } from "@/components/form/action-feedback";
import type { FormAction } from "@/components/form/action-form";
import { SubmitButton } from "@/components/form/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { content } from "@/content/es";
import { createFieldProps, IDLE_STATE } from "@/lib/actions/state";

interface AmountRowFormProps {
  action: FormAction;
  label: string;
  amount: number;
  /** Row identity — category or income source, plus the month when relevant. */
  hidden: Record<string, string>;
  badge?: string;
  /** A line of context under the amount — what else feeds into this row's plan. */
  note?: string;
  /** Offered only when this row currently overrides the template. */
  reset?: { action: FormAction; hidden: Record<string, string> };
}

function HiddenFields({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

function ResetForm({ action, hidden }: { action: FormAction; hidden: Record<string, string> }) {
  const [state, formAction] = useActionState(action, IDLE_STATE);

  return (
    <form action={formAction}>
      <HiddenFields values={hidden} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        aria-label={content.budget.resetToTemplate}
        title={content.budget.resetToTemplate}
      >
        <RotateCcw className="size-4" aria-hidden="true" />
      </Button>
      <ActionFeedback state={state} />
    </form>
  );
}

/**
 * One editable planned amount.
 *
 * Each row saves on its own, so a slow connection or a validation failure on
 * one category never costs the edits made to the others.
 */
export function AmountRowForm({
  action,
  label,
  amount,
  hidden,
  badge,
  note,
  reset,
}: AmountRowFormProps) {
  const [state, formAction] = useActionState(action, IDLE_STATE);
  const amountField = createFieldProps(state)("amount", String(amount));
  const error = amountField.error;
  const inputId = `amount-${Object.values(hidden).join("-")}`;

  return (
    <li className="grid gap-1.5 py-3">
      <div className="flex items-center gap-2">
        <label htmlFor={inputId} className="min-w-0 flex-1 truncate text-sm font-medium">
          {label}
        </label>
        {badge !== undefined ? (
          <Badge variant="outline" className="font-normal">
            {badge}
          </Badge>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <form action={formAction} className="flex flex-1 items-center gap-2">
          <HiddenFields values={hidden} />
          <Input
            id={inputId}
            name={amountField.name}
            defaultValue={amountField.defaultValue}
            inputMode="numeric"
            autoComplete="off"
            aria-invalid={error !== undefined}
            aria-describedby={error !== undefined ? `${inputId}-error` : undefined}
            className="flex-1"
          />
          <SubmitButton variant="outline" label={content.common.save} />
          <ActionFeedback state={state} />
        </form>

        {reset !== undefined ? <ResetForm action={reset.action} hidden={reset.hidden} /> : null}
      </div>

      {note !== undefined ? <p className="text-muted-foreground text-xs">{note}</p> : null}

      {error !== undefined ? (
        <p id={`${inputId}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </li>
  );
}
