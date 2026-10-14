"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";

/**
 * A page inside the app that failed to load — most often the reload after a
 * save, when Supabase's gateway times out.
 *
 * It renders inside the app layout, so the navigation stays usable, and it says
 * plainly that anything saved is safe. That is true by construction: a form
 * reports its save before the reload starts (see `ActionFeedback`), so reaching
 * this screen never means a write failed. `retry` fetches the page again.
 */
export default function AppError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <div className="grid place-items-center py-10">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{content.errors.refreshTitle}</CardTitle>
          <CardDescription>{content.errors.refreshDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={retry}>
            {content.errors.retry}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
