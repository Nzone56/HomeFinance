import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DonutChart, type DonutSlice } from "./donut-chart";

const slices: DonutSlice[] = [
  { key: "rent", label: "Arriendo", percentage: 50, color: "var(--chart-1)" },
  { key: "food", label: "Mercado", percentage: 30, color: "var(--chart-2)" },
  { key: "other", label: "Otros", percentage: 20, color: "var(--chart-axis)" },
];

const arcsOf = (container: HTMLElement) => [
  ...container.querySelectorAll("circle[stroke-dasharray]"),
];

describe("DonutChart", () => {
  it("names itself and prints the total in the hole", () => {
    render(
      <DonutChart slices={slices} label="Gastos por categoría">
        <span>$ 1.000.000</span>
      </DonutChart>,
    );

    expect(screen.getByRole("img", { name: "Gastos por categoría" })).toBeInTheDocument();
    expect(screen.getByText("$ 1.000.000")).toBeInTheDocument();
  });

  it("draws one arc per slice", () => {
    const { container } = render(
      <DonutChart slices={slices} label="Gastos">
        <span>Total</span>
      </DonutChart>,
    );

    expect(arcsOf(container)).toHaveLength(3);
  });

  it("names every slice, so hovering one says what it is", () => {
    const { container } = render(
      <DonutChart slices={slices} label="Gastos">
        <span>Total</span>
      </DonutChart>,
    );

    expect([...container.querySelectorAll("circle title")].map((t) => t.textContent)).toEqual([
      "Arriendo",
      "Mercado",
      "Otros",
    ]);
  });

  it("gives a bigger slice a longer arc", () => {
    const { container } = render(
      <DonutChart slices={slices} label="Gastos">
        <span>Total</span>
      </DonutChart>,
    );

    const lengthOf = (arc: Element) =>
      Number(arc.getAttribute("stroke-dasharray")?.split(" ").at(0));

    const [first, second] = arcsOf(container);
    expect(lengthOf(first as Element)).toBeGreaterThan(lengthOf(second as Element));
  });

  it("starts each slice where the one before it ended", () => {
    const { container } = render(
      <DonutChart slices={slices} label="Gastos">
        <span>Total</span>
      </DonutChart>,
    );

    const offsets = arcsOf(container).map((arc) => Number(arc.getAttribute("stroke-dashoffset")));

    expect(offsets.at(0)).toBe(0);
    // Each following slice is pushed further round, never overlapping.
    expect(offsets.at(1)).toBeLessThan(0);
    expect(offsets.at(2)).toBeLessThan(offsets.at(1) as number);
  });

  it("keeps a hairline of colour for a slice thinner than the gap", () => {
    // Rounded to 0%, a slice would otherwise vanish into the gap around it.
    const { container } = render(
      <DonutChart
        slices={[{ key: "tiny", label: "Salud", percentage: 0, color: "var(--chart-3)" }]}
        label="Gastos"
      >
        <span>Total</span>
      </DonutChart>,
    );

    const length = Number(
      arcsOf(container).at(0)?.getAttribute("stroke-dasharray")?.split(" ").at(0),
    );
    expect(length).toBeGreaterThan(0);
  });

  it("draws the track and nothing else when there is nothing to show", () => {
    const { container } = render(
      <DonutChart slices={[]} label="Gastos">
        <span>$ 0</span>
      </DonutChart>,
    );

    expect(arcsOf(container)).toHaveLength(0);
    expect(container.querySelectorAll("circle")).toHaveLength(1);
  });
});
