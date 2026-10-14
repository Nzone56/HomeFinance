import type { Route } from "next";

import type { MonthKey } from "@/lib/dates/month";

export const ROUTES = {
  dashboard: "/dashboard",
  expenses: "/expenses",
  income: "/income",
  budget: "/budget",
  settings: "/settings",
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

/**
 * `typedRoutes` cannot verify a URL assembled at runtime, so the assertion
 * lives here instead of being repeated at every call site. Paths always come
 * from `ROUTES` or `usePathname` — never from user input.
 */
export function toRoute(path: string, params: URLSearchParams): Route {
  const query = params.toString();
  return (query === "" ? path : `${path}?${query}`) as Route;
}

/**
 * The selected month travels in the query string so every view is linkable and
 * the server can render it directly. Any other params already in the URL — a
 * selected tab, say — are preserved.
 */
export function withMonth(path: string, month: MonthKey, current?: URLSearchParams): Route {
  const params = new URLSearchParams(current);
  params.set("month", month);
  return toRoute(path, params);
}
