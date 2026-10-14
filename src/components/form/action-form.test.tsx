import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { errorState, formValues, successState, type ActionState } from "@/lib/actions/state";

import { ActionForm } from "./action-form";
import { TextField } from "./field";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function renderForm(action: (state: ActionState, formData: FormData) => Promise<ActionState>) {
  return render(
    <ActionForm action={action}>
      {(fields) => <TextField label="Nombre" {...fields("name")} />}
    </ActionForm>,
  );
}

describe("ActionForm", () => {
  it("renders the fields and a save button", () => {
    renderForm(async () => successState("Listo"));

    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: content.common.save })).toBeInTheDocument();
  });

  it("sends what was typed to the action", async () => {
    const action = vi.fn(async (_state: ActionState, _formData: FormData) => successState("Listo"));
    renderForm(action);

    await userEvent.type(screen.getByLabelText("Nombre"), "Julián");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    const formData = action.mock.calls.at(0)?.[1];
    expect(formData?.get("name")).toBe("Julián");
  });

  it("announces a successful save", async () => {
    renderForm(async () => successState("Perfil actualizado."));

    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Perfil actualizado."));
  });

  it("shows a field message next to the field that caused it", async () => {
    renderForm(async () =>
      errorState(content.validation.formInvalid, { name: content.validation.required }),
    );

    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(content.validation.required),
    );
    expect(screen.getByLabelText("Nombre")).toHaveAttribute("aria-invalid", "true");
  });

  it("keeps what the user typed when the save fails", async () => {
    // React clears an uncontrolled form once its action resolves, so the action
    // echoes the submitted values back — exactly what `parseForm` does.
    renderForm(async (_state, formData) =>
      errorState("Falló", { name: "Obligatorio" }, formValues(formData)),
    );

    await userEvent.type(screen.getByLabelText("Nombre"), "Julián");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByLabelText("Nombre")).toHaveValue("Julián");
  });

  it("takes a custom submit label", () => {
    render(
      <ActionForm action={async () => successState("Listo")} submitLabel="Actualizar">
        {() => null}
      </ActionForm>,
    );

    expect(screen.getByRole("button", { name: "Actualizar" })).toBeInTheDocument();
  });
});
