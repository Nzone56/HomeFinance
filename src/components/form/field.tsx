import type { ComponentProps, ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  /** Must match the control's `id` so the label actually labels it. */
  htmlFor: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}

/**
 * Label, control, hint and error in the arrangement every form here uses.
 *
 * The control is passed in rather than generated so selects, switches and
 * inputs all share the same wiring. Callers point `aria-describedby` at
 * `describedBy(id, ...)` to link the hint and error text.
 */
export function Field({ label, htmlFor, hint, error, className, children }: FieldProps) {
  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint !== undefined ? (
        <p id={`${htmlFor}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      ) : null}
      {error !== undefined ? (
        <p id={`${htmlFor}-error`} role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The `aria-describedby` value for whichever of hint and error are present. */
export function describedBy(id: string, hint?: string, error?: string): string | undefined {
  const ids = [
    hint !== undefined ? `${id}-hint` : undefined,
    error !== undefined ? `${id}-error` : undefined,
  ].filter((value): value is string => value !== undefined);

  return ids.length > 0 ? ids.join(" ") : undefined;
}

type TextFieldProps = Omit<ComponentProps<typeof Input>, "id" | "name"> & {
  label: string;
  name: string;
  /**
   * Defaults to `name`. Pass an explicit id when the same field name appears
   * more than once on a page — one form per household member, say — so the
   * labels keep pointing at the right input.
   */
  id?: string;
  hint?: string;
  error?: string;
  fieldClassName?: string;
};

/** The common case: a labelled text, number or date input. */
export function TextField({
  label,
  name,
  id = name,
  hint,
  error,
  fieldClassName,
  ...inputProps
}: TextFieldProps) {
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} className={fieldClassName}>
      <Input
        id={id}
        name={name}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy(id, hint, error)}
        {...inputProps}
      />
    </Field>
  );
}
