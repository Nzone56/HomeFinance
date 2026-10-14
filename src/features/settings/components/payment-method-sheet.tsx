"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { ActionSheet } from "@/components/form/action-sheet";
import { TextField } from "@/components/form/field";
import { SelectField } from "@/components/form/select-field";
import { SwitchField } from "@/components/form/switch-field";
import { Button } from "@/components/ui/button";
import { content } from "@/content/es";
import { savePaymentMethod } from "@/features/settings/actions";
import { paymentMethodTypeOptions } from "@/features/transactions/lib/options";
import type { SelectOption } from "@/lib/ui/select-option";
import type { PaymentMethodRow, PaymentMethodType } from "@/types/database";

interface PaymentMethodSheetProps {
  members: readonly SelectOption[];
  /** Omitted when creating a new method. */
  method?: PaymentMethodRow;
}

function optionalNumber(value: number | null): string | undefined {
  return value === null ? undefined : String(value);
}

/**
 * Creates or edits a payment method.
 *
 * The credit-card fields appear only for credit cards, mirroring the database
 * constraint that keeps a limit or a closing day off a cash "method".
 */
export function PaymentMethodSheet({ members, method }: PaymentMethodSheetProps) {
  const [type, setType] = useState<PaymentMethodType>(method?.type ?? "bank_account");
  const isCreditCard = type === "credit_card";
  const isEditing = method !== undefined;

  return (
    <ActionSheet
      action={savePaymentMethod}
      title={isEditing ? method.name : content.settings.newPaymentMethod}
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
          {isEditing ? <input type="hidden" name="id" value={method.id} /> : null}

          <TextField
            label={content.settings.methodName}
            placeholder={content.settings.methodNamePlaceholder}
            autoComplete="off"
            required
            {...fields("name", method?.name)}
          />

          <SelectField
            label={content.settings.methodType}
            options={paymentMethodTypeOptions()}
            value={type}
            onValueChange={(next) => setType(next as PaymentMethodType)}
            required
            {...fields("type")}
          />

          <SelectField
            label={content.settings.methodOwner}
            options={members}
            required
            {...fields("user_id", method?.user_id)}
          />

          {isCreditCard ? (
            <>
              <TextField
                label={content.settings.creditLimit}
                inputMode="numeric"
                autoComplete="off"
                {...fields("credit_limit", optionalNumber(method?.credit_limit ?? null))}
              />
              <TextField
                label={content.settings.closingDay}
                inputMode="numeric"
                autoComplete="off"
                hint={content.settings.dayHint}
                {...fields("closing_day", optionalNumber(method?.closing_day ?? null))}
              />
              <TextField
                label={content.settings.dueDay}
                inputMode="numeric"
                autoComplete="off"
                {...fields("due_day", optionalNumber(method?.due_day ?? null))}
              />
              <TextField
                label={content.settings.openingDebt}
                hint={content.settings.openingDebtHint}
                inputMode="numeric"
                autoComplete="off"
                placeholder="0"
                {...fields("opening_debt", optionalNumber(method?.opening_debt ?? null))}
              />
              <TextField
                label={content.settings.defaultRate}
                hint={content.settings.defaultRateHint}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                {...fields(
                  "default_annual_rate_percent",
                  optionalNumber(method?.default_annual_rate_percent ?? null),
                )}
              />
            </>
          ) : null}

          <SwitchField
            label={content.settings.methodActive}
            name="active"
            defaultChecked={fields.isChecked("active", method?.active ?? true)}
          />
        </>
      )}
    </ActionSheet>
  );
}
