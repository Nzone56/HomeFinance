import { PageSkeleton } from "@/components/layout/page-skeleton";

/** Shown the instant the route is chosen; prefetched, so it needs no round trip. */
export default function DashboardLoading() {
  return <PageSkeleton layout="dashboard" />;
}
