"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { content } from "@/content/es";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  label?: string;
  pendingLabel?: string;
  /**
   * Whether the save is in flight, for a form that dispatches its action itself
   * rather than through `<form action>` — `useFormStatus` cannot see those.
   */
  pending?: boolean;
};

/**
 * A submit button that disables itself while its form is in flight.
 *
 * `useFormStatus` reads the state of the enclosing form, so this works for any
 * Server Action without being handed the pending flag — unless the form
 * dispatches the action itself, in which case the caller passes `pending`.
 */
export function SubmitButton({
  label = content.common.save,
  pendingLabel = content.common.saving,
  pending: pendingOverride,
  disabled,
  children,
  ...buttonProps
}: SubmitButtonProps) {
  const status = useFormStatus();
  const pending = pendingOverride ?? status.pending;

  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending} {...buttonProps}>
      {children ?? (pending ? pendingLabel : label)}
    </Button>
  );
}
