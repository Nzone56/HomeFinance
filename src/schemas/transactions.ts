import { z } from "zod";

import { content } from "@/content/es";

import {
  amountField,
  checkboxField,
  idField,
  installmentsField,
  isoDateField,
  optionalIdField,
  optionalIsoDateField,
  optionalRateField,
  optionalRepeatField,
  optionalText,
  requiredText,
  splitPercentField,
} from "./fields";

export const expenseInputSchema = z
  .object({
    description: requiredText(120),
    amount: amountField,
    occurred_on: isoDateField,
    category_id: idField,
    payment_method_id: idField,
    /** Who paid, independent of which payment method was used. */
    user_id: idField,
    shared: checkboxField,
    /** For a shared expense, the payer's part; the other member carries the rest. */
    payer_share_percent: splitPercentField,
    notes: optionalText(500),
    /** Consecutive months this amount spreads across. */
    installments: installmentsField,
    /** %EA charged on the installments, for a card purchase a cuotas. */
    annual_rate_percent: optionalRateField,
    /** Repeat the same amount every N months. */
    repeat_months: optionalRepeatField,
    repeat_until: optionalIsoDateField,
  })
  // The database enforces both of these too; catching them here means the user
  // gets a message next to the field rather than a failed write.
  .refine((value) => value.annual_rate_percent === null || value.installments > 1, {
    error: content.validation.rateNeedsInstallments,
    path: ["annual_rate_percent"],
  })
  .refine((value) => value.repeat_until === null || value.repeat_months !== null, {
    error: content.validation.repeatUntilNeedsRepeat,
    path: ["repeat_until"],
  });

/**
 * The same fields again, with the row to write them to.
 *
 * Intersected rather than extended: `expenseInputSchema` carries refinements,
 * so it is no longer a plain object schema and cannot be reopened. Doing it
 * this way keeps one definition of what an expense is.
 */
export const expenseUpdateSchema = z.object({ id: idField }).and(expenseInputSchema);

export const incomeInputSchema = z.object({
  label: requiredText(120),
  amount: amountField,
  occurred_on: isoDateField,
  user_id: idField,
  payment_method_id: optionalIdField,
  notes: optionalText(500),
});

export const transferInputSchema = z
  .object({
    from_payment_method_id: idField,
    to_payment_method_id: idField,
    amount: amountField,
    occurred_on: isoDateField,
    user_id: idField,
    notes: optionalText(500),
  })
  .refine((value) => value.from_payment_method_id !== value.to_payment_method_id, {
    error: content.validation.sameAccount,
    path: ["to_payment_method_id"],
  });

/**
 * Switching one expense on or off. The desired state is posted explicitly
 * rather than as a checkbox, so the request says what it wants instead of
 * depending on the row's current value.
 */
export const expenseActiveSchema = z.object({
  id: idField,
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;
export type IncomeInput = z.infer<typeof incomeInputSchema>;
export type TransferInput = z.infer<typeof transferInputSchema>;
