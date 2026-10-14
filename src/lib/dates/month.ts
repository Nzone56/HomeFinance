import {
  addMonths,
  endOfMonth,
  format,
  getDaysInMonth,
  isValid,
  parseISO,
  setDate,
} from "date-fns";

/**
 * A month is identified by its `yyyy-MM` key everywhere in the app: in the
 * URL, in component props and as the key of any per-month lookup. The database
 * stores the same month as a `date` pinned to the first day, `yyyy-MM-01`.
 */
export type MonthKey = string;

/** ISO calendar date, `yyyy-MM-dd`. */
export type IsoDate = string;

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const ISO_DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isMonthKey(value: string): boolean {
  return MONTH_KEY_PATTERN.test(value);
}

export function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value) && isValid(parseISO(value));
}

export function toMonthKey(date: Date): MonthKey {
  return format(date, "yyyy-MM");
}

/** Local midnight on the first day of the month. */
export function monthKeyToDate(key: MonthKey): Date {
  return parseISO(`${key}-01`);
}

/** The `yyyy-MM-01` value stored in month columns. */
export function monthKeyToIsoDate(key: MonthKey): IsoDate {
  return `${key}-01`;
}

/**
 * Parses a date-only column value at local midnight. `parseISO` is used rather
 * than `new Date(value)`, which would read `yyyy-MM-dd` as UTC and shift the
 * day backwards for anyone west of Greenwich.
 */
export function parseDateOnly(value: IsoDate): Date {
  return parseISO(value);
}

export function formatIsoDate(date: Date): IsoDate {
  return format(date, "yyyy-MM-dd");
}

/** The month a transaction falls in, taken straight from its stored date. */
export function isoDateToMonthKey(value: IsoDate): MonthKey {
  return value.slice(0, 7);
}

/** The `yyyy-MM-dd` of the last day of the month, for range queries. */
export function monthEndIsoDate(key: MonthKey): IsoDate {
  return formatIsoDate(endOfMonth(monthKeyToDate(key)));
}

export function currentMonthKey(reference: Date): MonthKey {
  return toMonthKey(reference);
}

export function shiftMonthKey(key: MonthKey, delta: number): MonthKey {
  return toMonthKey(addMonths(monthKeyToDate(key), delta));
}

/**
 * Reads the month out of a URL parameter, falling back when it is missing or
 * unusable — a hand-edited link, most likely.
 *
 * The fallback is passed in rather than read from the clock so the server and
 * the browser always agree on which month is "current", even across a midnight
 * or a timezone difference.
 */
export function resolveMonthKey(
  candidate: string | null | undefined,
  fallback: MonthKey,
): MonthKey {
  if (typeof candidate === "string" && isMonthKey(candidate)) {
    return candidate;
  }
  return fallback;
}

/**
 * Places a day-of-month inside a specific month, clamping to the last real day.
 * A credit card that closes on the 31st closes on the 28th each February.
 */
export function clampDayToMonth(monthDate: Date, day: number): Date {
  return setDate(monthDate, Math.min(day, getDaysInMonth(monthDate)));
}
