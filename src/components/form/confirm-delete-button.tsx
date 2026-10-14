"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useCallback, useState } from "react";

import { ActionFeedback } from "@/components/form/action-feedback";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { content } from "@/content/es";
import { IDLE_STATE } from "@/lib/actions/state";

import type { FormAction } from "./action-form";

interface ConfirmDeleteButtonProps {
  action: FormAction;
  /** Row to delete. Posted as `id`; the server re-checks it against the household. */
  id: string;
  confirmMessage: string;
  /** Accessible name for the icon button. */
  label: string;
}

/**
 * Deleting money records is easy to do by accident on a phone, so it asks
 * first. The confirmation is a real dialog rather than `window.confirm`, which
 * is unstyleable and blocked in some installed-PWA contexts.
 */
export function ConfirmDeleteButton({
  action,
  id,
  confirmMessage,
  label,
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, IDLE_STATE);

  const handleSuccess = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>{confirmMessage}</DialogDescription>
        </DialogHeader>

        <form action={formAction}>
          <input type="hidden" name="id" value={id} />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {content.common.cancel}
            </Button>
            <SubmitButton variant="destructive" label={content.common.delete} />
          </DialogFooter>
        </form>

        <ActionFeedback state={state} onSuccess={handleSuccess} />
      </DialogContent>
    </Dialog>
  );
}
