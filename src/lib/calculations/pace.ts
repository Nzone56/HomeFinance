import { getDate, getDaysInMonth } from "date-fns";

import { monthKeyToDate, toMonthKey, type MonthKey } from "@/lib/dates/month";

/**
 * How far through the month we are, 0–100.
 *
 * This is what turns "has spent 60% of the plan" into something you can act on:
 * 60% spent on the 9th is a problem, and on the 27th it is not. A month already
 * gone is 100% elapsed and one not yet started is 0%, so the figure stays
 * honest while browsing other months.
 *
 * The day itself counts as elapsed — on the last day of the month the answer is
 * 100, not 97.
 */
export function monthProgress(month: MonthKey, reference: Date): number {
  const currentMonth = toMonthKey(reference);

  if (month < currentMonth) {
    return 100;
  }
  if (month > currentMonth) {
    return 0;
  }

  return Math.round((getDate(reference) / getDaysInMonth(monthKeyToDate(month))) * 100);
}
