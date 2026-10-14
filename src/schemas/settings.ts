import { z } from "zod";

import { content } from "@/content/es";

import {
  blankAsZeroAmountField,
  checkboxField,
  idField,
  optionalAmountField,
  optionalDayField,
  optionalRateField,
  requiredText,
  sortOrderField,
} from "./fields";

const paymentMethodTypeField = z.enum(["bank_account", "benefits_card", "credit_card", "cash"], {
  error: content.validation.idInvalid,
});

/**
 * Credit-card fields belong to credit cards and nothing else — the same rule
 * the database enforces with a check constraint.
 *
 * The transform clears the card fields for every other type, so a user who
 * fills in a limit and then switches the type cannot smuggle it through.
 */
export const paymentMethodInputSchema = z
  .object({
    name: requiredText(60),
    type: paymentMethodTypeField,
    user_id: idField,
    active: checkboxField,
    credit_limit: optionalAmountField,
    closing_day: optionalDayField,
    due_day: optionalDayField,
    /** The %EA this card offers by default for purchases a cuotas. */
    default_annual_rate_percent: optionalRateField,
    /** What the card already owed before the app knew about it. Blank is none. */
    opening_debt: blankAsZeroAmountField,
  })
  .superRefine((value, ctx) => {
    if (value.type !== "credit_card") {
      return;
    }
    if (value.credit_limit === null || value.closing_day === null || value.due_day === null) {
      ctx.addIssue({
        code: "custom",
        message: content.validation.creditCardFieldsRequired,
        path: ["credit_limit"],
      });
    }
  })
  .transform((value) =>
    value.type === "credit_card"
      ? value
      : {
          ...value,
          credit_limit: null,
          closing_day: null,
          due_day: null,
          default_annual_rate_percent: null,
          opening_debt: 0,
        },
  );

export const categoryInputSchema = z.object({
  name: requiredText(40),
  sort_order: sortOrderField,
  archived: checkboxField,
});

export const profileInputSchema = z.object({
  display_name: requiredText(60),
});

export const householdInputSchema = z.object({
  name: requiredText(80),
});

export type PaymentMethodInput = z.infer<typeof paymentMethodInputSchema>;
export type CategoryInput = z.infer<typeof categoryInputSchema>;
export type ProfileInput = z.infer<typeof profileInputSchema>;
export type HouseholdInput = z.infer<typeof householdInputSchema>;
