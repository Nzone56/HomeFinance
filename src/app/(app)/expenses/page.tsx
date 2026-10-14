import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/layout/page-skeleton";
import { content } from "@/content/es";
import { MovementsView } from "@/features/transactions/components/movements-view";
import { currentMonthKey, resolveMonthKey } from "@/lib/dates/month";
import { formatMonthLabel } from "@/lib/format/date";

export const metadata: Metadata = { title: content.expenses.title };

interface ExpensesPageProps {
  searchParams: Promise<{ month?: string }>;
}

/** Renders at once; the month streams in behind a boundary keyed by the month. */
export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const { month: monthParam } = await searchParams;
  const month = resolveMonthKey(monthParam, currentMonthKey(new Date()));

  return (
    <Suspense
      key={month}
      fallback={
        <PageSkeleton
          title={content.expenses.title}
          subtitle={formatMonthLabel(month)}
          layout="list"
        />
      }
    >
      <MovementsView month={month} />
    </Suspense>
  );
}
