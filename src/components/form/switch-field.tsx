"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SwitchFieldProps {
  label: string;
  name: string;
  hint?: string;
  defaultChecked?: boolean;
  /** For a form that shows or hides other fields as this one flips. */
  onCheckedChange?: (checked: boolean) => void;
}

/**
 * A labelled toggle that posts `on` when enabled and nothing when not — the
 * same shape as a native checkbox, which is what the schemas expect.
 */
export function SwitchField({
  label,
  name,
  hint,
  defaultChecked = false,
  onCheckedChange,
}: SwitchFieldProps) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
      <div className="grid gap-1">
        <Label htmlFor={name}>{label}</Label>
        {hint !== undefined ? (
          <p id={`${name}-hint`} className="text-muted-foreground text-xs">
            {hint}
          </p>
        ) : null}
      </div>
      <Switch
        id={name}
        name={name}
        defaultChecked={defaultChecked}
        onCheckedChange={onCheckedChange}
        aria-describedby={hint !== undefined ? `${name}-hint` : undefined}
      />
    </div>
  );
}
