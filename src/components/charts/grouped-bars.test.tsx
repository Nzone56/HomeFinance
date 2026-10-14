import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GroupedBars, type BarGroup, type BarSeries } from "./grouped-bars";

const planned: BarSeries = { key: "planned", label: "Planificado", color: "var(--chart-4)" };
const actual: BarSeries = { key: "actual", label: "Real", color: "var(--chart-1)" };

const groups: BarGroup[] = [
  {
    key: "income",
    label: "Ingresos",
    bars: [
      { series: planned, value: 8_000_000 },
      { series: actual, value: 7_400_000 },
    ],
  },
  {
    key: "remaining",
    label: "Disponible",
    bars: [
      { series: planned, value: 4_500_000 },
      { series: actual, value: -1_000_000 },
    ],
  },
];

const renderChart = () =>
  render(<GroupedBars series={[planned, actual]} groups={groups} label="Resumen mensual" />);

describe("GroupedBars", () => {
  it("names itself and labels every group", () => {
    renderChart();

    expect(screen.getByRole("img", { name: "Resumen mensual" })).toBeInTheDocument();
    // Once under the bars and once as the table view's row heading.
    expect(screen.getAllByText("Ingresos")).toHaveLength(2);
    expect(screen.getAllByText("Disponible")).toHaveLength(2);
  });

  it("carries a legend, because two series are never told apart by position alone", () => {
    renderChart();

    // Once in the legend and once in the table view's column heading.
    expect(screen.getAllByText("Planificado").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Real").length).toBeGreaterThan(0);
  });

  it("prints each bar's own figure beside it", () => {
    renderChart();

    expect(screen.getAllByText("$8 M").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$7,4 M").length).toBeGreaterThan(0);
  });

  it("ships the same figures as a table for a screen reader", () => {
    renderChart();

    const table = screen.getByRole("table");
    const row = within(table).getByRole("row", { name: /Disponible/ });

    expect(within(row).getByText("$4,5 M")).toBeInTheDocument();
    expect(within(row).getByText("-$1 M")).toBeInTheDocument();
  });

  it("hangs a negative bar below the zero line rather than shrinking it to nothing", () => {
    const { container } = render(
      <GroupedBars
        series={[actual]}
        groups={[
          { key: "a", label: "A", bars: [{ series: actual, value: -1_000_000 }] },
          { key: "b", label: "B", bars: [{ series: actual, value: 1_000_000 }] },
        ]}
        label="Con negativos"
      />,
    );

    // Zero sits halfway up, so the negative bar starts at the bottom of the plot.
    const bars = [...container.querySelectorAll("div[style*='height']")];
    expect(bars.at(0)?.getAttribute("style")).toContain("bottom: 0%");
  });

  it("renders a month where nothing has happened without collapsing", () => {
    render(
      <GroupedBars
        series={[actual]}
        groups={[{ key: "a", label: "A", bars: [{ series: actual, value: 0 }] }]}
        label="Vacío"
      />,
    );

    expect(screen.getByRole("img", { name: "Vacío" })).toBeInTheDocument();
  });
});
