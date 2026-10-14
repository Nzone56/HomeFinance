"use client";

import { Pencil, Plus } from "lucide-react";

import { ActionSheet } from "@/components/form/action-sheet";
import { TextField } from "@/components/form/field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { Button } from "@/components/ui/button";
import { content } from "@/content/es";
import { saveIncomeSource } from "@/features/settings/actions";
import { NO_SELECTION, type SelectOption } from "@/lib/ui/select-option";
import type { IncomeTemplateItemRow } from "@/types/database";

interface IncomeSourceSheetProps {
  members: readonly SelectOption[];
  /** Accounts an income can land in — never a credit card. */
  accounts: readonly SelectOption[];
  /**
   * The source being edited, with `amount` already set to what it brings from
   * the current month onward rather than the amount it started with.
   */
  source?: IncomeTemplateItemRow;
  defaultUserId: string;
}

/**
 * An expected income source — a salary, a benefits card, freelance work.
 *
 * A new source is expected from this month on; changing the amount later
 * applies from this month on too, so months already gone keep what they
 * expected. A single month that differs is adjusted on the Plan screen.
 */
export function IncomeSourceSheet({
  members,
  accounts,
  source,
  defaultUserId,
}: IncomeSourceSheetProps) {
  const isEditing = source !== undefined;
  const accountChoices: SelectOption[] = [
    { value: NO_SELECTION, label: content.income.noAccount },
    ...accounts,
  ];

  return (
    <ActionSheet
      action={saveIncomeSource}
      title={isEditing ? source.label : content.settings.newIncomeSource}
      trigger={
        isEditing ? (
          <Button type="button" variant="ghost" size="icon" aria-label={content.common.edit}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" size="sm">
            <Plus className="size-4" aria-hidden="true" />
            {content.common.add}
          </Button>
        )
      }
    >
      {(fields) => (
        <>
          {isEditing ? <input type="hidden" name="id" value={source.id} /> : null}

          <TextField
            label={content.settings.incomeSourceLabel}
            autoComplete="off"
            required
            {...fields("label", source?.label)}
          />

          <SelectField
            label={content.settings.incomeSourceOwner}
            options={members}
            required
            {...fields("user_id", source?.user_id ?? defaultUserId)}
          />

          <TextField
            label={content.settings.incomeSourceAmount}
            hint={content.settings.incomeSourceAmountHint}
            inputMode="numeric"
            autoComplete="off"
            placeholder="0"
            required
            {...fields("amount", source === undefined ? undefined : String(source.amount))}
          />

          <SelectField
            label={content.settings.incomeSourceAccount}
            hint={content.settings.incomeSourceAccountHint}
            options={accountChoices}
            {...fields("payment_method_id", source?.payment_method_id ?? NO_SELECTION)}
          />

          <SwitchField
            label={content.settings.incomeSourceActive}
            name="active"
            defaultChecked={fields.isChecked("active", source?.active ?? true)}
          />
        </>
      )}
    </ActionSheet>
  );
}
