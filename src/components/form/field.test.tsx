import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { describedBy, Field, TextField } from "./field";

describe("describedBy", () => {
  it("names nothing when there is no hint and no error", () => {
    expect(describedBy("amount")).toBeUndefined();
  });

  it("names the hint alone", () => {
    expect(describedBy("amount", "Día del mes")).toBe("amount-hint");
  });

  it("names the error alone", () => {
    expect(describedBy("amount", undefined, "Obligatorio")).toBe("amount-error");
  });

  it("names both, so a screen reader reads the hint and the problem", () => {
    expect(describedBy("amount", "Día del mes", "Obligatorio")).toBe("amount-hint amount-error");
  });
});

describe("Field", () => {
  it("labels the control it wraps", () => {
    render(
      <Field label="Monto" htmlFor="amount">
        <input id="amount" />
      </Field>,
    );

    expect(screen.getByLabelText("Monto")).toBeInTheDocument();
  });

  it("shows a hint when there is one", () => {
    render(
      <Field label="Día" htmlFor="day" hint="Día del mes, de 1 a 31.">
        <input id="day" />
      </Field>,
    );

    expect(screen.getByText("Día del mes, de 1 a 31.")).toHaveAttribute("id", "day-hint");
  });

  it("announces an error to assistive technology", () => {
    render(
      <Field label="Monto" htmlFor="amount" error="Obligatorio">
        <input id="amount" />
      </Field>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Obligatorio");
  });

  it("shows neither hint nor error when there is nothing to say", () => {
    render(
      <Field label="Monto" htmlFor="amount">
        <input id="amount" />
      </Field>,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("TextField", () => {
  it("renders a labelled input that posts under its name", () => {
    render(<TextField label="Descripción" name="description" />);

    const input = screen.getByLabelText("Descripción");
    expect(input).toHaveAttribute("name", "description");
    expect(input).toHaveAttribute("id", "description");
  });

  it("marks the input invalid and points at the message", () => {
    render(<TextField label="Monto" name="amount" error="Obligatorio" />);

    const input = screen.getByLabelText("Monto");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAttribute("aria-describedby", "amount-error");
  });

  it("is not marked invalid when there is no error", () => {
    render(<TextField label="Monto" name="amount" />);

    expect(screen.getByLabelText("Monto")).toHaveAttribute("aria-invalid", "false");
  });

  it("takes a distinct id so repeated field names still label correctly", () => {
    // The same form repeated once per row on one page.
    render(
      <>
        <TextField label="Julián" name="display_name" id="display_name-julian" />
        <TextField label="GF" name="display_name" id="display_name-gf" />
      </>,
    );

    expect(screen.getByLabelText("Julián")).toHaveAttribute("id", "display_name-julian");
    expect(screen.getByLabelText("GF")).toHaveAttribute("id", "display_name-gf");
  });

  it("passes input attributes through", () => {
    render(<TextField label="Monto" name="amount" inputMode="numeric" defaultValue="80000" />);

    const input = screen.getByLabelText("Monto");
    expect(input).toHaveAttribute("inputmode", "numeric");
    expect(input).toHaveValue("80000");
  });
});
