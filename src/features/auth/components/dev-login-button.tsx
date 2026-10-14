"use client";

import { useActionState } from "react";

import { ActionFeedback } from "@/components/form/action-feedback";
import { SubmitButton } from "@/components/form/submit-button";
import { content } from "@/content/es";
import { devSignIn } from "@/features/auth/actions";
import { IDLE_STATE } from "@/lib/actions/state";

/**
 * One click into the app with the test account. The login page renders it only
 * while developing; the credentials stay on the server with the action. A
 * refused sign-in is announced as a toast rather than doing nothing.
 */
export function DevLoginButton() {
  const [state, formAction] = useActionState(devSignIn, IDLE_STATE);

  return (
    <form action={formAction} className="grid gap-1.5 border-t border-dashed pt-4">
      <SubmitButton
        variant="outline"
        className="w-full"
        label={content.auth.devLogin}
        pendingLabel={content.auth.submitting}
      />
      <p className="text-muted-foreground text-center text-xs">{content.auth.devLoginHint}</p>
      <ActionFeedback state={state} />
    </form>
  );
}
