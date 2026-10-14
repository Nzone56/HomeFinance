"use client";

import { useActionState } from "react";

import { TextField } from "@/components/form/field";
import { SubmitButton } from "@/components/form/submit-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { content } from "@/content/es";
import { signIn } from "@/features/auth/actions";
import { createFieldProps, IDLE_STATE } from "@/lib/actions/state";

export function LoginForm() {
  const [state, formAction] = useActionState(signIn, IDLE_STATE);
  const fields = createFieldProps(state);

  return (
    <form action={formAction} className="grid gap-4" noValidate>
      <TextField
        label={content.auth.email}
        type="email"
        autoComplete="email"
        placeholder={content.auth.emailPlaceholder}
        required
        {...fields("email")}
      />

      <TextField
        label={content.auth.password}
        type="password"
        autoComplete="current-password"
        required
        {...fields("password")}
      />

      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <SubmitButton
        label={content.auth.submit}
        pendingLabel={content.auth.submitting}
        className="w-full"
      />
    </form>
  );
}
