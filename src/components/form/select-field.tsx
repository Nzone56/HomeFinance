"use client";

import type { SelectOption } from "@/lib/ui/select-option";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { describedBy, Field } from "./field";

export type { SelectOption };

interface SelectFieldProps {
  label: string;
  name: string;
  options: readonly SelectOption[];
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  /** Re-mounts the control so a `defaultValue` change actually takes effect. */
  onValueChange?: (value: string) => void;
  value?: string;
}

/**
 * A labelled select that posts with the form.
 *
 * Radix renders a hidden native control for `name`, so this works inside a
 * plain `<form action={serverAction}>` with no client state of its own.
 */
export function SelectField({
  label,
  name,
  options,
  defaultValue,
  placeholder,
  hint,
  error,
  required,
  value,
  onValueChange,
}: SelectFieldProps) {
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error}>
      <Select
        name={name}
        defaultValue={defaultValue}
        value={value}
        onValueChange={onValueChange}
        required={required}
      >
        <SelectTrigger
          id={name}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy(name, hint, error)}
          className="w-full"
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
