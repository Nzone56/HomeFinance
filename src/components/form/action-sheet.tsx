"use client";

import {
  startTransition,
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { ActionFeedback } from "@/components/form/action-feedback";
import { SubmitButton } from "@/components/form/submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { createFieldProps, IDLE_STATE, type FieldPropsFactory } from "@/lib/actions/state";
import { DESKTOP_QUERY, useMediaQuery } from "@/lib/ui/use-media-query";

import type { FormAction } from "./action-form";

interface ActionSheetProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  action: FormAction;
  /**
   * Receives a factory that wires each field to its name, its error message and
   * the value last submitted. Spread it onto the field: `{...fields("amount")}`.
   */
  children: (fields: FieldPropsFactory) => ReactNode;
  submitLabel?: string;
  /** Called after a successful save, once the panel has closed. */
  onSaved?: () => void;
}

/**
 * A form in the shape the screen calls for.
 *
 * On a phone it is a drawer up from the bottom, which is where the thumb is and
 * where most entries actually get typed. On a desktop a full-width drawer is
 * the wrong shape entirely — a column of fields marooned in a field of empty
 * panel — so the same form becomes a centred dialog of reading width.
 *
 * Both halves render the identical form, so nothing about the fields, the
 * action or the restored values depends on which one you get. The fields scroll
 * inside the panel while the title and the save button stay put, because a long
 * form should never hide its own submit button.
 *
 * The action is dispatched from `onSubmit`, never through `<form action>`.
 * React resets a form after a form action finishes — a rejected one included —
 * and Radix's Select and Switch listen for that reset and snap back to the
 * value they mounted with. Every choice made in the form silently reverted on a
 * failed save, while the text fields were restored. Dispatching it ourselves
 * means nothing on screen changes except the messages.
 *
 * A rejected save moves focus to the first field that needs attention, which
 * also scrolls it into view: the message used to sit above the fold while the
 * panel was scrolled down to the save button.
 *
 * On success it closes and the form resets, so the next entry starts from a
 * clean slate instead of the previous one's values.
 */
export function ActionSheet({
  trigger,
  title,
  description,
  action,
  children,
  submitLabel,
  onSaved,
}: ActionSheetProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(action, IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const isDesktop = useMediaQuery(DESKTOP_QUERY);

  const handleSuccess = useCallback(() => {
    setOpen(false);
    formRef.current?.reset();
    onSaved?.();
  }, [onSaved]);

  useEffect(() => {
    const form = formRef.current;
    // The panel may have been closed while the save was still on its way.
    if (state.status !== "error" || form === null) {
      return;
    }
    form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [state]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  const body = (padding: string) => (
    <form ref={formRef} onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className={`grid min-h-0 flex-1 gap-4 overflow-y-auto py-4 ${padding}`}>
        {children(createFieldProps(state))}
      </div>

      <div className={`flex justify-end border-t py-4 ${padding}`}>
        <SubmitButton label={submitLabel} pending={isPending} className="w-full sm:w-auto" />
      </div>
    </form>
  );

  // The feedback lives OUTSIDE the panel. Inside it, it unmounted with the
  // closed panel and remounted on reopen, found the previous save's success
  // still in `state`, and closed the panel again the moment it opened.
  const feedback = <ActionFeedback state={state} onSuccess={handleSuccess} />;

  if (isDesktop) {
    return (
      <>
        {feedback}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>{trigger}</DialogTrigger>

          {/* Fades and lifts in rather than zooming, and closes at once: see
              `animate-dialog-in` in globals.css for why the zoom was slow. */}
          <DialogContent className="data-open:animate-dialog-in data-closed:animate-none flex max-h-[85dvh] flex-col gap-0 p-0 sm:max-w-lg">
            <DialogHeader className="border-b px-6 py-4 text-left">
              <DialogTitle>{title}</DialogTitle>
              {description !== undefined ? (
                <DialogDescription>{description}</DialogDescription>
              ) : null}
            </DialogHeader>

            {body("px-6")}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      {feedback}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>{trigger}</SheetTrigger>

        <SheetContent side="bottom" className="flex max-h-[90dvh] flex-col gap-0 p-0">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>{title}</SheetTitle>
            {description !== undefined ? <SheetDescription>{description}</SheetDescription> : null}
          </SheetHeader>

          {body("px-4")}
        </SheetContent>
      </Sheet>
    </>
  );
}
