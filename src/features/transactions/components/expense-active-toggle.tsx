"use client";

import { startTransition, useActionState, useOptimistic } from "react";

import { ActionFeedback } from "@/components/form/action-feedback";
import { Switch } from "@/components/ui/switch";
import { content } from "@/content/es";
import { setExpenseActive } from "@/features/transactions/actions";
import { IDLE_STATE } from "@/lib/actions/state";

interface ExpenseActiveToggleProps {
  id: string;
  active: boolean;
}

/**
 * Switches one expense in or out of the month's totals.
 *
 * The action is dispatched directly rather than through a `<form>` on purpose.
 * A form here submitted twice per click: the first write landed, the page
 * revalidated, and a hidden input derived from the `active` prop recomputed to
 * the opposite value before the second submit flipped the row straight back.
 * Taking the target state from the switch's own callback removes both the
 * second submit and the dependence on a prop that changes mid-flight.
 *
 * `useOptimistic` moves the switch immediately, so flicking several expenses
 * off to see the effect on the totals feels instant rather than like a queue of
 * round trips.
 */
export function ExpenseActiveToggle({ id, active }: ExpenseActiveToggleProps) {
  const [state, formAction] = useActionState(setExpenseActive, IDLE_STATE);
  const [optimisticActive, setOptimisticActive] = useOptimistic(active);

  function toggle(next: boolean) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("active", String(next));

    startTransition(() => {
      setOptimisticActive(next);
      formAction(formData);
    });
  }

  return (
    <>
      <Switch
        checked={optimisticActive}
        onCheckedChange={toggle}
        aria-label={content.a11y.toggleExpense}
      />
      <ActionFeedback state={state} />
    </>
  );
}
