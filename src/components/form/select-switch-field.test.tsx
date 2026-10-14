import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SelectField } from "./select-field";
import { SwitchField } from "./switch-field";

const options = [
  { value: "rent", label: "Arriendo" },
  { value: "food", label: "Mercado" },
];

describe("SelectField", () => {
  it("renders a labelled select", () => {
    render(<SelectField label="Categoría" name="category_id" options={options} />);

    expect(screen.getByRole("combobox", { name: "Categoría" })).toBeInTheDocument();
  });

  it("offers every option", async () => {
    render(<SelectField label="Categoría" name="category_id" options={options} />);

    await userEvent.click(screen.getByRole("combobox", { name: "Categoría" }));

    expect(screen.getByRole("option", { name: "Arriendo" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Mercado" })).toBeInTheDocument();
  });

  it("starts on the given value", () => {
    render(
      <SelectField label="Categoría" name="category_id" options={options} defaultValue="food" />,
    );

    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveTextContent("Mercado");
  });

  it("shows a placeholder when nothing is chosen", () => {
    render(
      <SelectField
        label="Categoría"
        name="category_id"
        options={options}
        placeholder="Elige una"
      />,
    );

    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveTextContent("Elige una");
  });

  it("reports a chosen value to the caller when controlled", async () => {
    const onValueChange = vi.fn();
    render(
      <SelectField
        label="Categoría"
        name="category_id"
        options={options}
        onValueChange={onValueChange}
      />,
    );

    await userEvent.click(screen.getByRole("combobox", { name: "Categoría" }));
    await userEvent.click(screen.getByRole("option", { name: "Mercado" }));

    expect(onValueChange).toHaveBeenCalledWith("food");
  });

  it("marks itself invalid and points at the message", () => {
    render(
      <SelectField label="Categoría" name="category_id" options={options} error="Obligatorio" />,
    );

    const trigger = screen.getByRole("combobox", { name: "Categoría" });
    expect(trigger).toHaveAttribute("aria-invalid", "true");
    expect(trigger).toHaveAttribute("aria-describedby", "category_id-error");
    expect(screen.getByRole("alert")).toHaveTextContent("Obligatorio");
  });

  it("describes itself with a hint when there is one", () => {
    render(
      <SelectField label="Categoría" name="category_id" options={options} hint="Elige bien" />,
    );

    expect(screen.getByRole("combobox", { name: "Categoría" })).toHaveAttribute(
      "aria-describedby",
      "category_id-hint",
    );
  });
});

describe("SwitchField", () => {
  it("renders a labelled toggle", () => {
    render(<SwitchField label="Gasto compartido" name="shared" />);

    expect(screen.getByRole("switch", { name: "Gasto compartido" })).toBeInTheDocument();
  });

  it("starts off by default", () => {
    render(<SwitchField label="Gasto compartido" name="shared" />);

    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("starts on when asked", () => {
    render(<SwitchField label="Gasto compartido" name="shared" defaultChecked />);

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("toggles", async () => {
    render(<SwitchField label="Gasto compartido" name="shared" />);

    await userEvent.click(screen.getByRole("switch"));

    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("tells its form when it flips, so dependent fields can follow", async () => {
    const onCheckedChange = vi.fn();
    render(
      <SwitchField label="Gasto compartido" name="shared" onCheckedChange={onCheckedChange} />,
    );

    await userEvent.click(screen.getByRole("switch"));

    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("shows a hint and describes itself with it", () => {
    render(<SwitchField label="Gasto compartido" name="shared" hint="Se reparte entre los dos" />);

    expect(screen.getByText("Se reparte entre los dos")).toHaveAttribute("id", "shared-hint");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-describedby", "shared-hint");
  });

  it("has no description when there is no hint", () => {
    render(<SwitchField label="Gasto compartido" name="shared" />);

    expect(screen.getByRole("switch")).not.toHaveAttribute("aria-describedby");
  });
});
