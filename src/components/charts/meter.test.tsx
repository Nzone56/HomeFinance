import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Meter } from "./meter";

describe("Meter", () => {
  it("reports its value to assistive technology", () => {
    render(<Meter value={40} label="Mercado" fill="var(--status-good)" />);

    const meter = screen.getByRole("meter", { name: "Mercado" });
    expect(meter).toHaveAttribute("aria-valuenow", "40");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "100");
  });

  it("fills in proportion to the value", () => {
    const { container } = render(<Meter value={40} label="Mercado" fill="red" />);

    expect(container.querySelector<HTMLElement>("[role=meter] > div")?.style.width).toBe("40%");
  });

  it("stops the fill at the track when the value runs past the limit", () => {
    const { container } = render(<Meter value={250} label="Mercado" fill="red" />);

    expect(container.querySelector<HTMLElement>("[role=meter] > div")?.style.width).toBe("100%");
    // The true figure is still reported, so nothing is hidden.
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "250");
  });

  it("never draws a negative fill", () => {
    const { container } = render(<Meter value={-20} label="Mercado" fill="red" />);

    expect(container.querySelector<HTMLElement>("[role=meter] > div")?.style.width).toBe("0%");
  });

  it("rounds the reported value", () => {
    render(<Meter value={33.4} label="Mercado" fill="red" />);

    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "33");
  });

  it("takes the fill colour from the caller, so status and identity both work", () => {
    const { container } = render(<Meter value={50} label="Mercado" fill="var(--chart-2)" />);

    expect(container.querySelector<HTMLElement>("[role=meter] > div")?.style.backgroundColor).toBe(
      "var(--chart-2)",
    );
  });

  it("accepts extra classes", () => {
    render(<Meter value={50} label="Mercado" fill="red" className="h-4" />);

    expect(screen.getByRole("meter")).toHaveClass("h-4");
  });
});
