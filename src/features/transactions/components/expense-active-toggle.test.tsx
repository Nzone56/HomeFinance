import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { setExpenseActive } from "@/features/transactions/actions";
import { successState, type ActionState } from "@/lib/actions/state";

import { ExpenseActiveToggle } from "./expense-active-toggle";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/transactions/actions", () => ({
  setExpenseActive: vi.fn(async () => successState("Listo")),
}));

const lastPayload = () => vi.mocked(setExpenseActive).mock.calls.at(0)?.[1];

beforeEach(() => {
  vi.mocked(setExpenseActive).mockImplementation(async () => successState("Listo"));
});

describe("ExpenseActiveToggle", () => {
  it("shows an included expense as switched on", () => {
    render(<ExpenseActiveToggle id="expense-1" active />);

    expect(screen.getByRole("switch", { name: content.a11y.toggleExpense })).toBeChecked();
  });

  it("shows an excluded expense as switched off", () => {
    render(<ExpenseActiveToggle id="expense-1" active={false} />);

    expect(screen.getByRole("switch", { name: content.a11y.toggleExpense })).not.toBeChecked();
  });

  it("asks to switch an included expense off", async () => {
    render(<ExpenseActiveToggle id="expense-1" active />);

    await userEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(setExpenseActive).toHaveBeenCalled());
    expect(lastPayload()?.get("id")).toBe("expense-1");
    expect(lastPayload()?.get("active")).toBe("false");
  });

  it("asks to switch an excluded expense back on", async () => {
    render(<ExpenseActiveToggle id="expense-1" active={false} />);

    await userEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(setExpenseActive).toHaveBeenCalled());
    expect(lastPayload()?.get("active")).toBe("true");
  });

  it("dispatches exactly once per click", async () => {
    // Regression: submitting through a <form> fired twice. The first write
    // landed, the page revalidated, and the second submit — reading a hidden
    // field derived from the now-stale prop — flipped the row straight back,
    // so switching an expense off appeared to do nothing at all.
    render(<ExpenseActiveToggle id="expense-1" active />);

    await userEvent.click(screen.getByRole("switch"));

    await waitFor(() => expect(setExpenseActive).toHaveBeenCalledTimes(1));
    expect(setExpenseActive).toHaveBeenCalledTimes(1);
  });

  it("takes the target state from the switch, not from the current prop", async () => {
    render(<ExpenseActiveToggle id="expense-1" active />);

    await userEvent.click(screen.getByRole("switch"));

    // Even if `active` were to change underneath, the request still carries the
    // state the user actually asked for.
    await waitFor(() => expect(lastPayload()?.get("active")).toBe("false"));
  });

  it("moves immediately rather than waiting for the round trip", async () => {
    let settle: (state: ActionState) => void = () => {};
    vi.mocked(setExpenseActive).mockImplementation(
      () =>
        new Promise<ActionState>((resolve) => {
          settle = resolve;
        }),
    );

    render(<ExpenseActiveToggle id="expense-1" active />);
    const toggle = screen.getByRole("switch");

    await userEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());

    settle(successState("Listo"));
  });
});
