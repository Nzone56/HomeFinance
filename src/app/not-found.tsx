import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import { ROUTES } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{content.errors.notFoundTitle}</CardTitle>
          <CardDescription>{content.errors.notFoundDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href={ROUTES.dashboard}>{content.errors.backToDashboard}</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
