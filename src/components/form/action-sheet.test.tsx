import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";
import { content } from "@/content/es";
import { errorState, formValues, successState, type ActionState } from "@/lib/actions/state";

import { setDesktop } from "@/test/media";

import { ActionSheet } from "./action-sheet";
import { TextField } from "./field";
import { SelectField } from "./select-field";
import { SwitchField } from "./switch-field";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

function renderSheet(action: Action, description?: string) {
  return render(
    <ActionSheet
      action={action}
      title="Nuevo gasto"
      description={description}
      trigger={<Button type="button">Abrir</Button>}
    >
      {(fields) => <TextField label="Descripción" {...fields("description")} />}
    </ActionSheet>,
  );
}

const open = () => userEvent.click(screen.getByRole("button", { name: "Abrir" }));

describe("ActionSheet", () => {
  it("stays closed until the trigger is used", () => {
    renderSheet(async () => successState("Listo"));

    expect(screen.queryByLabelText("Descripción")).not.toBeInTheDocument();
  });

  it("opens with its title and fields", async () => {
    renderSheet(async () => successState("Listo"));

    await open();

    expect(screen.getByRole("dialog", { name: "Nuevo gasto" })).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
  });

  it("shows a description when given one", async () => {
    renderSheet(async () => successState("Listo"), "Un traslado no es un gasto");

    await open();

    expect(screen.getByText("Un traslado no es un gasto")).toBeInTheDocument();
  });

  it("sends what was typed to the action", async () => {
    const action = vi.fn(async (_state: ActionState, _formData: FormData) => successState("Listo"));
    renderSheet(action);

    await open();
    await userEvent.type(screen.getByLabelText("Descripción"), "Agua");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls.at(0)?.[1]?.get("description")).toBe("Agua");
  });

  it("closes itself once the save lands", async () => {
    renderSheet(async () => successState("Gasto registrado."));

    await open();
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Gasto registrado."));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("clears the form on the way out, so the next entry starts clean", async () => {
    renderSheet(async () => successState("Listo"));

    await open();
    const field = screen.getByLabelText("Descripción");
    await userEvent.type(field, "Agua");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    // The drawer closes and the form is reset on its way out. Reopening it
    // cannot be driven here — Radix waits for an exit animation jsdom never
    // fires — so this checks the reset itself on the element that was open.
    await waitFor(() => expect(field).toHaveValue(""));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("stays open when reopened after a save, instead of closing again at once (regression)", async () => {
    renderSheet(async () => successState("Gasto actualizado."));

    await open();
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await open();

    // The previous save's success used to be replayed on reopen: a second
    // toast, and the panel shut before it could be used.
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("stays open and keeps what was typed when the save fails", async () => {
    renderSheet(async (_state, formData) =>
      errorState(
        content.validation.formInvalid,
        { description: "Obligatorio" },
        formValues(formData),
      ),
    );

    await open();
    await userEvent.type(screen.getByLabelText("Descripción"), "Agua");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Descripción")).toHaveValue("Agua");
    expect(screen.getByRole("alert")).toHaveTextContent("Obligatorio");
  });

  it("keeps every choice made in the form after a rejected save (regression)", async () => {
    // React used to reset the form after the action, and Radix's Select and
    // Switch answer a reset by snapping back to the value they mounted with.
    const action = vi.fn(async (_state: ActionState, formData: FormData) =>
      errorState(
        content.validation.formInvalid,
        { description: "Obligatorio" },
        formValues(formData),
      ),
    );

    render(
      <ActionSheet
        action={action}
        title="Nuevo gasto"
        trigger={<Button type="button">Abrir</Button>}
      >
        {(fields) => (
          <>
            <TextField label="Descripción" {...fields("description")} />
            <SelectField
              label="Pagado por"
              options={[
                { value: "julian", label: "Julián" },
                { value: "gf", label: "GF" },
              ]}
              {...fields("user_id", "julian")}
            />
            <SwitchField label="Gasto compartido" name="shared" defaultChecked />
          </>
        )}
      </ActionSheet>,
    );

    await open();
    await userEvent.click(screen.getByRole("combobox", { name: "Pagado por" }));
    await userEvent.click(screen.getByRole("option", { name: "GF" }));
    await userEvent.click(screen.getByRole("switch", { name: "Gasto compartido" }));
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(action.mock.calls.at(0)?.[1]?.get("user_id")).toBe("gf");
    expect(screen.getByRole("combobox", { name: "Pagado por" })).toHaveTextContent("GF");
    expect(screen.getByRole("switch", { name: "Gasto compartido" })).not.toBeChecked();
  });

  it("moves focus to the first field that needs attention, so it scrolls into view", async () => {
    renderSheet(async (_state, formData) =>
      errorState(
        content.validation.formInvalid,
        { description: "Obligatorio" },
        formValues(formData),
      ),
    );

    await open();
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(screen.getByLabelText("Descripción")).toHaveFocus());
  });

  it("leaves focus where it was when the failure names no field", async () => {
    renderSheet(async () => errorState(content.common.genericError));

    await open();
    const save = screen.getByRole("button", { name: content.common.save });
    await userEvent.click(save);

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(content.common.genericError));
    expect(save).toHaveFocus();
  });

  it("copes with a rejection that arrives after the panel was closed", async () => {
    let reject: (state: ActionState) => void = () => undefined;
    renderSheet(
      () =>
        new Promise<ActionState>((resolve) => {
          reject = resolve;
        }),
    );

    await open();
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    reject(errorState(content.validation.formInvalid, { description: "Obligatorio" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("disables the save button while the save is in flight", async () => {
    let finish: (state: ActionState) => void = () => undefined;
    renderSheet(
      () =>
        new Promise<ActionState>((resolve) => {
          finish = resolve;
        }),
    );

    await open();
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    expect(await screen.findByRole("button", { name: content.common.saving })).toBeDisabled();

    finish(errorState(content.common.genericError));

    expect(await screen.findByRole("button", { name: content.common.save })).toBeEnabled();
  });

  it("takes a custom submit label", async () => {
    render(
      <ActionSheet
        action={async () => successState("Listo")}
        title="Nuevo gasto"
        submitLabel="Registrar"
        trigger={<Button type="button">Abrir</Button>}
      >
        {() => null}
      </ActionSheet>,
    );

    await open();

    expect(screen.getByRole("button", { name: "Registrar" })).toBeInTheDocument();
  });
});

describe("ActionSheet on a desktop screen", () => {
  beforeEach(() => setDesktop(true));

  it("becomes a centred dialog rather than a full-width drawer", async () => {
    renderSheet(async () => successState("Listo"));

    await open();

    const dialog = screen.getByRole("dialog", { name: "Nuevo gasto" });
    expect(dialog).toHaveClass("sm:max-w-lg");
    expect(screen.getByLabelText("Descripción")).toBeInTheDocument();
  });

  it("fades in rather than zooming, so its fields arrive with its frame (regression)", async () => {
    // The vendored zoom re-rasterized every field on every frame, and on a
    // desktop screen the contents visibly trailed the panel.
    renderSheet(async () => successState("Listo"));

    await open();

    const dialog = screen.getByRole("dialog", { name: "Nuevo gasto" });
    expect(dialog).toHaveClass("data-open:animate-dialog-in", "data-closed:animate-none");
    // `zoom-in-95` may linger as an inert variable; the animation that read it must not.
    expect(dialog).not.toHaveClass("data-open:animate-in");
    expect(dialog).not.toHaveClass("data-closed:animate-out");
  });

  it("shows a description there too when given one", async () => {
    renderSheet(async () => successState("Listo"), "Un traslado no es un gasto");

    await open();

    expect(screen.getByText("Un traslado no es un gasto")).toBeInTheDocument();
  });

  it("runs the same form and the same action", async () => {
    const action = vi.fn(async (_state: ActionState, _formData: FormData) => successState("Listo"));
    renderSheet(action);

    await open();
    await userEvent.type(screen.getByLabelText("Descripción"), "Agua");
    await userEvent.click(screen.getByRole("button", { name: content.common.save }));

    await waitFor(() => expect(action).toHaveBeenCalled());
    expect(action.mock.calls.at(0)?.[1]?.get("description")).toBe("Agua");
  });
});
