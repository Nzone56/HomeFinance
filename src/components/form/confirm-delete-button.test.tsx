import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { errorState, successState, type ActionState } from "@/lib/actions/state";

import { ConfirmDeleteButton } from "./confirm-delete-button";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

function renderButton(action: Action) {
  return render(
    <ConfirmDeleteButton
      action={action}
      id="expense-1"
      label="Eliminar gasto"
      confirmMessage="¿Eliminar este gasto?"
    />,
  );
}

const openDialog = () => userEvent.click(screen.getByRole("button", { name: "Eliminar gasto" }));

describe("ConfirmDeleteButton", () => {
  it("asks before deleting anything", async () => {
    const action = vi.fn(async () => successState("Listo"));
    renderButton(action);

    await openDialog();

    expect(screen.getByRole("dialog")).toHaveTextContent("¿Eliminar este gasto?");
    expect(action).not.toHaveBeenCalled();
  });

  it("does nothing when the answer is no", async () => {
    const action = vi.fn(async () => successState("Listo"));
    renderButton(action);

    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: content.common.cancel }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(action).not.toHaveBeenCalled();
  });

  it("deletes the row it was given when confirmed", async () => {
    const action = vi.fn(async (_state: ActionState, _formData: FormData) =>
      successState("Gasto eliminado."),
    );
    renderButton(action);

    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: content.common.delete }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls.at(0)?.[1]?.get("id")).toBe("expense-1");
  });

  it("closes and announces once the row is gone", async () => {
    renderButton(async () => successState("Gasto eliminado."));

    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: content.common.delete }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Gasto eliminado."));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("stays open when the delete fails, so the failure is not missed", async () => {
    renderButton(async () => errorState("Algo salió mal."));

    await openDialog();
    await userEvent.click(screen.getByRole("button", { name: content.common.delete }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Algo salió mal."));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("names itself for anyone who cannot see the icon", () => {
    renderButton(async () => successState("Listo"));

    expect(screen.getByRole("button", { name: "Eliminar gasto" })).toBeInTheDocument();
  });
});
