"use client";

import { useActionState, type ReactNode } from "react";

import { ActionFeedback } from "@/components/form/action-feedback";
import { SubmitButton } from "@/components/form/submit-button";
import {
  createFieldProps,
  IDLE_STATE,
  type ActionState,
  type FieldPropsFactory,
} from "@/lib/actions/state";
import { cn } from "@/lib/utils";

export type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

interface ActionFormProps {
  action: FormAction;
  /**
   * Receives a factory that wires each field to its name, its error message and
   * the value last submitted. Spread it onto the field: `{...fields("amount")}`.
   */
  children: (fields: FieldPropsFactory) => ReactNode;
  submitLabel?: string;
  className?: string;
  footerClassName?: string;
}

/**
 * A form wired to a Server Action: pending state on the button, field errors
 * next to their inputs, and the outcome announced as a toast.
 *
 * Used directly for the settings forms that live on the page; `ActionSheet`
 * wraps this same pattern in a drawer for the create forms.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  footerClassName,
}: ActionFormProps) {
  const [state, formAction] = useActionState(action, IDLE_STATE);

  return (
    <form action={formAction} className={cn("grid gap-4", className)} noValidate>
      {children(createFieldProps(state))}
      <div className={cn("flex justify-end", footerClassName)}>
        <SubmitButton label={submitLabel} />
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
