import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/components/layout/page-skeleton";
import { content } from "@/content/es";
import { IncomeView } from "@/features/income/components/income-view";
import { currentMonthKey, resolveMonthKey } from "@/lib/dates/month";
import { formatMonthLabel } from "@/lib/format/date";

export const metadata: Metadata = { title: content.income.title };

interface IncomePageProps {
  searchParams: Promise<{ month?: string }>;
}

/** Renders at once; the month streams in behind a boundary keyed by the month. */
export default async function IncomePage({ searchParams }: IncomePageProps) {
  const { month: monthParam } = await searchParams;
  const month = resolveMonthKey(monthParam, currentMonthKey(new Date()));

  return (
    <Suspense
      key={month}
      fallback={
        <PageSkeleton
          title={content.income.title}
          subtitle={formatMonthLabel(month)}
          layout="cards"
        />
      }
    >
      <IncomeView month={month} />
    </Suspense>
  );
}
