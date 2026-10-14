import type { ZodError, ZodType } from "zod";

import { content } from "@/content/es";

/**
 * What a Server Action hands back to `useActionState`.
 *
 * Keeping this a plain discriminated union — rather than throwing — means a
 * failed save re-renders the form with its messages in place instead of
 * tripping an error boundary.
 */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | {
      status: "error";
      message: string;
      fieldErrors: Record<string, string>;
      /**
       * What was submitted. React clears an uncontrolled form once its action
       * resolves, so a failed save would otherwise wipe everything the user
       * typed. Echoing the values back lets the fields restore themselves.
       */
      values: Record<string, string>;
    };

export const IDLE_STATE: ActionState = { status: "idle" };

export function successState(message: string): ActionState {
  return { status: "success", message };
}

export function errorState(
  message: string,
  fieldErrors: Record<string, string> = {},
  values: Record<string, string> = {},
): ActionState {
  return { status: "error", message, fieldErrors, values };
}

/**
 * One message per field, keyed by the form input's `name`. The first issue
 * wins: showing a field's second complaint before its first is confusing.
 */
export function fieldErrorsFrom(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.map(String).join(".");
    if (!(field in errors)) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

/** The text the user submitted, for restoring the form after a failure. */
export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string") {
      values[key] = value;
    }
  }
  return values;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; state: ActionState };

/** Validates posted form fields, turning failures into renderable state. */
export function parseForm<T>(schema: ZodType<T>, formData: FormData): ParseResult<T> {
  const result = schema.safeParse(Object.fromEntries(formData));
  if (result.success) {
    return { ok: true, data: result.data };
  }
  return {
    ok: false,
    state: errorState(
      content.validation.formInvalid,
      fieldErrorsFrom(result.error),
      formValues(formData),
    ),
  };
}

/** Props a field needs to show its message and restore what was typed. */
export interface FieldProps {
  name: string;
  error?: string;
  defaultValue?: string;
}

export interface FieldPropsFactory {
  /** `fallback` is the stored value, used on a first render or after a success. */
  (name: string, fallback?: string): FieldProps;
  /** Whether a checkbox or switch should start on. */
  isChecked: (name: string, fallback: boolean) => boolean;
}

/**
 * Builds the per-field props for a form, given the last action result.
 *
 * Call sites spread this onto a field — `<TextField label="Monto"
 * {...fields("amount")} />` — which wires up the name, the error message and
 * the restored value in one place.
 */
export function createFieldProps(state: ActionState): FieldPropsFactory {
  const failed = state.status === "error";
  const errors = failed ? state.fieldErrors : {};
  const values = failed ? state.values : {};

  const factory = (name: string, fallback?: string): FieldProps => ({
    name,
    error: errors[name],
    defaultValue: values[name] ?? fallback,
  });

  factory.isChecked = (name: string, fallback: boolean): boolean =>
    failed ? values[name] === "on" || values[name] === "true" : fallback;

  return factory;
}
