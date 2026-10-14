import { render, screen } from "@testing-library/react";
import { useFormStatus } from "react-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";

import { SubmitButton } from "./submit-button";

vi.mock("react-dom", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useFormStatus: vi.fn(() => ({ pending: false })) };
});

const setPending = (pending: boolean) => {
  vi.mocked(useFormStatus).mockReturnValue({
    pending,
    data: null,
    method: null,
    action: null,
  } as ReturnType<typeof useFormStatus>);
};

beforeEach(() => {
  setPending(false);
});

describe("SubmitButton", () => {
  it("submits its form and shows the default label", () => {
    render(<SubmitButton />);

    const button = screen.getByRole("button", { name: content.common.save });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toBeEnabled();
  });

  it("takes a custom label", () => {
    render(<SubmitButton label="Entrar" />);

    expect(screen.getByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });

  it("disables itself and says so while the form is in flight", () => {
    setPending(true);

    render(<SubmitButton pendingLabel="Guardando…" />);

    const button = screen.getByRole("button", { name: "Guardando…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("takes the in-flight state from its caller when the form dispatches the action itself", () => {
    // `useFormStatus` never sees an action dispatched from `onSubmit`.
    render(<SubmitButton pending pendingLabel="Guardando…" />);

    expect(screen.getByRole("button", { name: "Guardando…" })).toBeDisabled();
  });

  it("lets the caller's state win over the form's", () => {
    setPending(true);

    render(<SubmitButton pending={false} />);

    expect(screen.getByRole("button", { name: content.common.save })).toBeEnabled();
  });

  it("stays disabled when the caller disables it", () => {
    render(<SubmitButton disabled />);

    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders custom children instead of a label", () => {
    render(<SubmitButton>Eliminar</SubmitButton>);

    expect(screen.getByRole("button", { name: "Eliminar" })).toBeInTheDocument();
  });
});
