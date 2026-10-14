import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/layout/page-skeleton";
import { content } from "@/content/es";
import { PlanView } from "@/features/budget/components/plan-view";
import { currentMonthKey, resolveMonthKey } from "@/lib/dates/month";

export const metadata: Metadata = { title: content.budget.title };

interface BudgetPageProps {
  searchParams: Promise<{ month?: string }>;
}

/** Renders at once; the month streams in behind a boundary keyed by the month. */
export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const { month: monthParam } = await searchParams;
  const month = resolveMonthKey(monthParam, currentMonthKey(new Date()));

  return (
    <Suspense key={month} fallback={<PageSkeleton title={content.budget.title} layout="cards" />}>
      <PlanView month={month} />
    </Suspense>
  );
}
