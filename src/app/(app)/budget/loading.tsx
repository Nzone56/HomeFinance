import { PageSkeleton } from "@/components/layout/page-skeleton";
import { content } from "@/content/es";

/** Shown the instant the route is chosen; prefetched, so it needs no round trip. */
export default function BudgetLoading() {
  return <PageSkeleton title={content.budget.title} layout="cards" />;
}
