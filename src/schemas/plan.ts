import { z } from "zod";

import {
  checkboxField,
  idField,
  monthKeyField,
  optionalIdField,
  plannedAmountField,
  requiredText,
} from "./fields";

/** One line of the template, applied from the current month onward. */
export const budgetTemplateItemSchema = z.object({
  category_id: idField,
  amount: plannedAmountField,
});

/** A deliberate departure from the template, for one month only. */
export const budgetMonthOverrideSchema = z.object({
  month: monthKeyField,
  category_id: idField,
  amount: plannedAmountField,
});

export const budgetOverrideResetSchema = z.object({
  month: monthKeyField,
  category_id: idField,
});

export const incomeTemplateItemSchema = z.object({
  user_id: idField,
  label: requiredText(60),
  amount: plannedAmountField,
  active: checkboxField,
  /** Where the income lands. Optional — cash need not land in an account. */
  payment_method_id: optionalIdField,
});

/** Editing just the baseline amount of an existing income source. */
export const incomeTemplateAmountSchema = z.object({
  template_item_id: idField,
  amount: plannedAmountField,
});

export const incomeMonthOverrideSchema = z.object({
  month: monthKeyField,
  template_item_id: idField,
  amount: plannedAmountField,
});

export const incomeOverrideResetSchema = z.object({
  month: monthKeyField,
  template_item_id: idField,
});

/** Recording one expected income as received, in the month it was expected. */
export const incomeReceiptSchema = z.object({
  month: monthKeyField,
  template_item_id: idField,
});

export type BudgetTemplateItemInput = z.infer<typeof budgetTemplateItemSchema>;
export type BudgetMonthOverrideInput = z.infer<typeof budgetMonthOverrideSchema>;
export type IncomeTemplateItemInput = z.infer<typeof incomeTemplateItemSchema>;
export type IncomeMonthOverrideInput = z.infer<typeof incomeMonthOverrideSchema>;
