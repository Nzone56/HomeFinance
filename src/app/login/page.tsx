import type { Metadata } from "next";
import Image from "next/image";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import { DevLoginButton } from "@/features/auth/components/dev-login-button";
import { LoginForm } from "@/features/auth/components/login-form";
import { devLoginCredentials } from "@/lib/auth/dev-login";

export const metadata: Metadata = {
  title: content.auth.submit,
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <Card className="appear w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <Image
            src="/icons/icon.svg"
            alt=""
            width={48}
            height={48}
            className="mb-2 rounded-xl"
            priority
          />
          <CardTitle>{content.auth.title}</CardTitle>
          <CardDescription>{content.auth.subtitle}</CardDescription>
        </CardHeader>

        <CardContent className="grid gap-6">
          <LoginForm />
          {devLoginCredentials() !== null ? <DevLoginButton /> : null}
          <p className="text-muted-foreground text-center text-xs">{content.auth.privateNotice}</p>
        </CardContent>
      </Card>
    </main>
  );
}
