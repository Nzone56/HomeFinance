import { Skeleton } from "@/components/ui/skeleton";
import { content } from "@/content/es";

/** The rough shape of what is about to arrive. */
export type SkeletonLayout = "dashboard" | "list" | "cards";

interface PageSkeletonProps {
  /** The page's own heading, shown for real — it is known before any data is. */
  title?: string;
  subtitle?: string;
  layout: SkeletonLayout;
}

const LIST_ROWS = 5;

function Heading({ title, subtitle }: Pick<PageSkeletonProps, "title" | "subtitle">) {
  // The dashboard greets by name, which is not known yet.
  if (title === undefined) {
    return <Skeleton className="h-8 w-56" />;
  }

  return (
    <h1 className="text-xl font-semibold">
      {title}
      {subtitle === undefined ? null : (
        <span className="text-muted-foreground ml-2 text-sm font-normal">{subtitle}</span>
      )}
    </h1>
  );
}

function DashboardBody() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {["income", "expenses", "remaining", "household"].map((key) => (
          <Skeleton key={key} className="h-32 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </>
  );
}

function ListBody() {
  return (
    <>
      <Skeleton className="h-9 w-56" />
      <div className="flex justify-end">
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid divide-y rounded-xl border">
        {Array.from({ length: LIST_ROWS }, (_, index) => (
          <div key={index} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="size-8 rounded-full" />
            <div className="grid flex-1 gap-1.5">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        ))}
      </div>
    </>
  );
}

function CardsBody() {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </>
  );
}

const BODIES: Record<SkeletonLayout, () => React.JSX.Element> = {
  dashboard: DashboardBody,
  list: ListBody,
  cards: CardsBody,
};

/**
 * What a page shows the instant it is chosen, while its data is on the way.
 *
 * Used both as the route's `loading.tsx` — which Next prefetches, so a click
 * paints it with no round trip at all — and as the fallback of the Suspense
 * boundary keyed by the month, so switching months shows it immediately too.
 * The shapes follow the real page closely enough that nothing jumps when the
 * content lands.
 */
export function PageSkeleton({ title, subtitle, layout }: PageSkeletonProps) {
  const Body = BODIES[layout];

  return (
    <div aria-busy="true" className="grid gap-6">
      <span role="status" className="sr-only">
        {content.common.loading}
      </span>
      <Heading title={title} subtitle={subtitle} />
      <Body />
    </div>
  );
}
