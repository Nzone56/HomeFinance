"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import type { ActionState } from "@/lib/actions/state";

interface ActionFeedbackProps {
  state: ActionState;
  /** Called once after a successful save — to close a sheet, say. */
  onSuccess?: () => void;
}

/**
 * Announces the result of a Server Action as a toast, and reloads the page's
 * data after a successful one.
 *
 * Field-level messages stay next to their inputs; this is for the overall
 * outcome, which is exactly what a transient toast is good at.
 *
 * The reload is its own request, made after the save has been reported.
 * `mutate` used to re-render inside the action's response, where a gateway
 * timeout while reloading made a saved card payment look like a failed save.
 * If this reload fails, `(app)/error.tsx` says the save is safe.
 */
export function ActionFeedback({ state, onSuccess }: ActionFeedbackProps) {
  const router = useRouter();

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      onSuccess?.();
      router.refresh();
      return;
    }
    if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, onSuccess, router]);

  return null;
}
