import { z } from "zod";

import { content } from "@/content/es";
import { isIsoDate, isMonthKey } from "@/lib/dates/month";
import { parseAmountInput } from "@/lib/format/currency";
import { NO_SELECTION } from "@/lib/ui/select-option";

/**
 * Reusable field builders.
 *
 * Forms post `FormData`, so every input arrives as a string. These builders own
 * the string-to-value step, which is why the schemas can be handed straight to
 * a Supabase insert.
 *
 * Field names deliberately mirror the database columns. The column names *are*
 * the domain vocabulary here, and matching them removes a mapping layer that
 * would otherwise have to be written and tested for every entity.
 */

const message = content.validation;

/** One trillion pesos — far above any real household figure, below 2^53. */
const MAX_AMOUNT = 999_999_999_999;

export const idField = z.uuid({ error: message.idInvalid });

/** A positive amount, typed as `1.500.000`, `$1.500.000` or `1500000`. */
export const amountField = z
  .string()
  .transform(parseAmountInput)
  .pipe(
    z
      .number({ error: message.amountInvalid })
      .int({ error: message.amountInvalid })
      .positive({ error: message.amountPositive })
      .max(MAX_AMOUNT, { error: message.amountTooLarge }),
  );

/** Planned amounts may legitimately be zero — that is how a month opts out. */
export const plannedAmountField = z
  .string()
  .transform(parseAmountInput)
  .pipe(
    z
      .number({ error: message.amountInvalid })
      .int({ error: message.amountInvalid })
      .nonnegative({ error: message.amountNotNegative })
      .max(MAX_AMOUNT, { error: message.amountTooLarge }),
  );

/**
 * A blank amount means "not set", which is different from zero.
 *
 * Text that cannot be read as a number is an error, not a blank: typing
 * nonsense into a credit limit must complain rather than quietly clear it.
 */
export const optionalAmountField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    if (trimmed === "") {
      return null;
    }
    return parseAmountInput(trimmed) ?? Number.NaN;
  })
  .pipe(
    z
      .number({ error: message.amountInvalid })
      .int({ error: message.amountInvalid })
      .positive({ error: message.amountPositive })
      .max(MAX_AMOUNT, { error: message.amountTooLarge })
      .nullable(),
  );

/**
 * An amount where blank means zero rather than "not set" — a card's starting
 * debt, which most cards simply do not have.
 */
export const blankAsZeroAmountField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    if (trimmed === "") {
      return 0;
    }
    return parseAmountInput(trimmed) ?? Number.NaN;
  })
  .pipe(
    z
      .number({ error: message.amountInvalid })
      .int({ error: message.amountInvalid })
      .nonnegative({ error: message.amountNotNegative })
      .max(MAX_AMOUNT, { error: message.amountTooLarge }),
  );

export const isoDateField = z.string().refine(isIsoDate, { error: message.dateInvalid });

export const monthKeyField = z.string().refine(isMonthKey, { error: message.monthInvalid });

export const optionalDayField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? null : Number(trimmed);
  })
  .pipe(
    z
      .number({ error: message.dayRange })
      .int({ error: message.dayRange })
      .min(1, { error: message.dayRange })
      .max(31, { error: message.dayRange })
      .nullable(),
  );

/**
 * The payer's part of a shared expense, as a whole percentage from 0 to 100.
 * Blank means an even split.
 */
export const splitPercentField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? 50 : Number(trimmed);
  })
  .pipe(
    z
      .number({ error: message.splitRange })
      .int({ error: message.splitRange })
      .min(0, { error: message.splitRange })
      .max(100, { error: message.splitRange }),
  );

export function requiredText(max: number) {
  return z
    .string()
    .trim()
    .min(1, { error: message.required })
    .max(max, { error: message.textTooLong });
}

/** An empty optional field is stored as `null`, never as an empty string. */
export function optionalText(max: number) {
  return z
    .string()
    .trim()
    .max(max, { error: message.textTooLong })
    .optional()
    .transform((value) => (value === undefined || value === "" ? null : value));
}

/** An unchecked checkbox is simply absent from the posted form. */
export const checkboxField = z
  .string()
  .optional()
  .transform((value) => value === "on" || value === "true");

/** A select that may be left blank, yielding `null` rather than an empty id. */
export const optionalIdField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" || trimmed === NO_SELECTION ? null : trimmed;
  })
  .pipe(z.uuid({ error: message.idInvalid }).nullable());

/** Display order for categories. Blank means "put it first". */
export const sortOrderField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? 0 : Number(trimmed);
  })
  .pipe(z.number({ error: message.required }).int({ error: message.required }));

/** How many consecutive months one amount spreads across. Blank means one. */
export const installmentsField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? 1 : Number(trimmed);
  })
  .pipe(
    z
      .number({ error: message.installmentsRange })
      .int({ error: message.installmentsRange })
      .min(1, { error: message.installmentsRange })
      .max(120, { error: message.installmentsRange }),
  );

/** Repeat every N months. Blank means the expense happens once. */
export const optionalRepeatField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" || trimmed === NO_SELECTION ? null : Number(trimmed);
  })
  .pipe(
    z
      .number({ error: message.repeatRange })
      .int({ error: message.repeatRange })
      .min(1, { error: message.repeatRange })
      .max(60, { error: message.repeatRange })
      .nullable(),
  );

/**
 * An effective annual rate typed as a percentage — `28,5` for 28,5% EA.
 * Accepts a comma or a point, since both are typed in Colombia.
 */
export const optionalRateField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim().replace(",", ".");
    return trimmed === "" ? null : Number(trimmed);
  })
  .pipe(
    z
      .number({ error: message.rateRange })
      .min(0, { error: message.rateRange })
      .max(200, { error: message.rateRange })
      .nullable(),
  );

/** A date that may be left blank, yielding `null`. */
export const optionalIsoDateField = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = (value ?? "").trim();
    return trimmed === "" ? null : trimmed;
  })
  .pipe(z.string().refine(isIsoDate, { error: message.dateInvalid }).nullable());
