"use client";

import { startTransition, useActionState, type FormEvent, type ReactNode } from "react";

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
 *
 * Dispatched from `onSubmit`, never `<form action>`, for the same reason
 * `ActionSheet` is: React resets a form once its action resolves, putting every
 * field back to the value it mounted with. Renaming the household showed the
 * save succeed and the field snap back to the old name for the length of the
 * reload — measured at 440ms — before the new name arrived.
 */
export function ActionForm({
  action,
  children,
  submitLabel,
  className,
  footerClassName,
}: ActionFormProps) {
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className={cn("grid gap-4", className)} noValidate>
      {children(createFieldProps(state))}
      <div className={cn("flex justify-end", footerClassName)}>
        <SubmitButton label={submitLabel} pending={isPending} />
      </div>
      <ActionFeedback state={state} />
    </form>
  );
}
