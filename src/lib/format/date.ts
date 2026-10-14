import { format } from "date-fns";
import { es } from "date-fns/locale";

import { monthKeyToDate, parseDateOnly, type IsoDate, type MonthKey } from "@/lib/dates/month";

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** `Septiembre 2026` */
export function formatMonthLabel(key: MonthKey): string {
  return capitalise(format(monthKeyToDate(key), "LLLL yyyy", { locale: es }));
}

/** `Sep 2026` — for tight spaces such as the month switcher on mobile. */
export function formatMonthLabelShort(key: MonthKey): string {
  return capitalise(format(monthKeyToDate(key), "LLL yyyy", { locale: es }));
}

/** `11 sep` — for transaction lists inside an already-known month. */
export function formatDayLabel(value: IsoDate): string {
  return format(parseDateOnly(value), "d MMM", { locale: es });
}

/** `11 de septiembre de 2026` */
export function formatFullDate(value: IsoDate): string {
  return format(parseDateOnly(value), "d 'de' MMMM 'de' yyyy", { locale: es });
}
