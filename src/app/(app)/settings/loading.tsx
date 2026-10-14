import { PageSkeleton } from "@/components/layout/page-skeleton";
import { content } from "@/content/es";

/** Shown the instant the route is chosen; prefetched, so it needs no round trip. */
export default function SettingsLoading() {
  return <PageSkeleton title={content.settings.title} layout="cards" />;
}
