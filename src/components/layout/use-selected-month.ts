"use client";

import { useSearchParams } from "next/navigation";

import { resolveMonthKey, type MonthKey } from "@/lib/dates/month";

/**
 * The month currently being viewed, read from the URL.
 *
 * Lets the shell stay month-aware even though a layout never receives
 * `searchParams`. The fallback comes from the server so the first client render
 * agrees with the HTML it is hydrating.
 */
export function useSelectedMonth(fallback: MonthKey): MonthKey {
  return resolveMonthKey(useSearchParams().get("month"), fallback);
}
