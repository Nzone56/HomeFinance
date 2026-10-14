import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { content } from "@/content/es";
import type { TrendPoint } from "@/lib/calculations/trend";

import { MonthlyTrendChart } from "./monthly-trend-chart";

const points: TrendPoint[] = [
  { month: "2026-07", income: 4_000_000, expenses: 3_000_000, remaining: 1_000_000 },
  { month: "2026-08", income: 5_000_000, expenses: 3_500_000, remaining: 1_500_000 },
  { month: "2026-09", income: 7_400_000, expenses: 2_940_000, remaining: 4_460_000 },
];

describe("MonthlyTrendChart", () => {
  it("plots one line per series", () => {
    const { container } = render(<MonthlyTrendChart points={points} />);

    expect(container.querySelectorAll("path")).toHaveLength(2);
  });

  it("always names both series, so colour is never the only channel", () => {
    render(<MonthlyTrendChart points={points} />);

    const legend = screen.getAllByRole("list").at(0);
    expect(within(legend as HTMLElement).getByText(content.dashboard.income)).toBeInTheDocument();
    expect(within(legend as HTMLElement).getByText(content.dashboard.expenses)).toBeInTheDocument();
  });

  it("labels the latest value of each series directly", () => {
    render(<MonthlyTrendChart points={points} />);

    expect(screen.getByText("$7,4 M")).toBeInTheDocument();
    expect(screen.getByText("$2,9 M")).toBeInTheDocument();
  });

  it("names every month on the axis", () => {
    render(<MonthlyTrendChart points={points} />);

    expect(screen.getByText("Jul 2026")).toBeInTheDocument();
    expect(screen.getByText("Sep 2026")).toBeInTheDocument();
  });

  it("offers the same figures as a table for anyone who cannot see it", () => {
    render(<MonthlyTrendChart points={points} />);

    const table = screen.getByRole("table", { name: content.dashboard.trend });
    expect(within(table).getByRole("rowheader", { name: "Septiembre 2026" })).toBeInTheDocument();
    expect(within(table).getByText("$ 7.400.000")).toBeInTheDocument();
  });

  it("labels the plot itself", () => {
    render(<MonthlyTrendChart points={points} />);

    expect(screen.getByRole("img", { name: content.dashboard.trend })).toBeInTheDocument();
  });

  it("shows both figures for the month under the pointer", async () => {
    const { container } = render(<MonthlyTrendChart points={points} />);

    const bands = container.querySelectorAll("rect");
    await userEvent.hover(bands[0] as Element);

    const tooltip = await screen.findByRole("status");
    expect(within(tooltip).getByText("Julio 2026")).toBeInTheDocument();
    expect(within(tooltip).getByText(/\$ 4\.000\.000/)).toBeInTheDocument();
  });

  it("puts the tooltip away again", async () => {
    const { container } = render(<MonthlyTrendChart points={points} />);

    const band = container.querySelectorAll("rect")[0] as Element;
    await userEvent.hover(band);
    expect(screen.getByRole("status")).toBeInTheDocument();

    await userEvent.unhover(band);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("keeps the tooltip clear of the point it describes", async () => {
    const { container } = render(<MonthlyTrendChart points={points} />);
    const bands = container.querySelectorAll("rect");

    // Hovering the last month moves the tooltip to the opposite side.
    await userEvent.hover(bands[bands.length - 1] as Element);
    expect(screen.getByRole("status")).toHaveStyle({ left: "0px" });
  });

  it("says so when there is nothing to plot yet", () => {
    render(
      <MonthlyTrendChart points={[{ month: "2026-09", income: 0, expenses: 0, remaining: 0 }]} />,
    );

    expect(screen.getByText(content.dashboard.trendEmpty)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("says so when there are no months at all", () => {
    render(<MonthlyTrendChart points={[]} />);

    expect(screen.getByText(content.dashboard.trendEmpty)).toBeInTheDocument();
  });

  it("keeps the tooltip on the other side for an early month", async () => {
    const { container } = render(<MonthlyTrendChart points={points} />);

    await userEvent.hover(container.querySelectorAll("rect")[0] as Element);

    expect(screen.getByRole("status")).toHaveStyle({ right: "0px" });
  });

  it("handles a single month without dividing by zero", () => {
    const { container } = render(<MonthlyTrendChart points={[points[2] as TrendPoint]} />);

    expect(container.querySelectorAll("path")).toHaveLength(2);
    expect(screen.getByText("Sep 2026")).toBeInTheDocument();
  });
});
