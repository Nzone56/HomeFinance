"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";

/**
 * A failed data load lands here rather than rendering half a dashboard with
 * missing numbers, which would be worse than showing nothing.
 */
export default function ErrorBoundary({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{content.errors.title}</CardTitle>
          <CardDescription>{content.errors.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" onClick={reset}>
            {content.errors.retry}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
