import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/layout/page-skeleton";
import { content } from "@/content/es";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import { currentMonthKey, resolveMonthKey } from "@/lib/dates/month";

export const metadata: Metadata = { title: content.dashboard.title };

interface DashboardPageProps {
  searchParams: Promise<{ month?: string }>;
}

/**
 * The page only reads the URL, so it renders at once; the month streams in
 * behind a Suspense boundary keyed by the month. The key is what makes switching
 * months show the skeleton immediately — without it React keeps the old month
 * on screen, looking frozen, until the new one has fully loaded.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { month: monthParam } = await searchParams;
  const currentMonth = currentMonthKey(new Date());
  const month = resolveMonthKey(monthParam, currentMonth);

  return (
    <Suspense key={month} fallback={<PageSkeleton layout="dashboard" />}>
      <DashboardView month={month} currentMonth={currentMonth} />
    </Suspense>
  );
}
