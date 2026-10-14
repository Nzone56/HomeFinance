import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressRing } from "./progress-ring";

const arcOf = (container: HTMLElement) => container.querySelector("circle[stroke-dasharray]");

describe("ProgressRing", () => {
  it("names itself and prints the figure in the middle", () => {
    render(
      <ProgressRing value={62} label="Presupuesto" fill="var(--status-good)">
        <span>62%</span>
      </ProgressRing>,
    );

    expect(screen.getByRole("img", { name: "Presupuesto" })).toBeInTheDocument();
    expect(screen.getByText("62%")).toBeInTheDocument();
  });

  it("draws a longer arc for a larger share", () => {
    const { container: half } = render(
      <ProgressRing value={50} label="Mitad" fill="var(--status-good)">
        <span>50%</span>
      </ProgressRing>,
    );
    const { container: quarter } = render(
      <ProgressRing value={25} label="Cuarto" fill="var(--status-good)">
        <span>25%</span>
      </ProgressRing>,
    );

    const lengthOf = (element: Element | null) =>
      Number(element?.getAttribute("stroke-dasharray")?.split(" ").at(0));

    expect(lengthOf(arcOf(half))).toBeGreaterThan(lengthOf(arcOf(quarter)));
  });

  it("draws no arc at all at zero, rather than a stray dot", () => {
    // A round line cap paints a dot even at length zero.
    const { container } = render(
      <ProgressRing value={0} label="Nada" fill="var(--status-good)">
        <span>0%</span>
      </ProgressRing>,
    );

    expect(arcOf(container)).toBeNull();
  });

  it("stops the arc at a full circle however far past the limit it goes", () => {
    const { container: full } = render(
      <ProgressRing value={100} label="Lleno" fill="var(--status-critical)">
        <span>100%</span>
      </ProgressRing>,
    );
    const { container: over } = render(
      <ProgressRing value={240} label="Pasado" fill="var(--status-critical)">
        <span>240%</span>
      </ProgressRing>,
    );

    expect(arcOf(over)?.getAttribute("stroke-dasharray")).toBe(
      arcOf(full)?.getAttribute("stroke-dasharray"),
    );
  });

  it("carries no marker unless one is asked for", () => {
    const { container } = render(
      <ProgressRing value={40} label="Sin marca" fill="var(--status-good)">
        <span>40%</span>
      </ProgressRing>,
    );

    expect(container.querySelector("line")).toBeNull();
  });

  it("names the marker, so hovering it says what the tick means", () => {
    const { container } = render(
      <ProgressRing
        value={40}
        label="Presupuesto"
        fill="var(--status-good)"
        marker={{ value: 25, label: "Hoy en el mes" }}
      >
        <span>40%</span>
      </ProgressRing>,
    );

    expect(container.querySelector("line title")).toHaveTextContent("Hoy en el mes");
  });

  it("puts the marker where its own value sits on the ring", () => {
    const { container: top } = render(
      <ProgressRing
        value={40}
        label="Arriba"
        fill="var(--status-good)"
        marker={{ value: 0, label: "Hoy" }}
      >
        <span>40%</span>
      </ProgressRing>,
    );
    const { container: right } = render(
      <ProgressRing
        value={40}
        label="Derecha"
        fill="var(--status-good)"
        marker={{ value: 25, label: "Hoy" }}
      >
        <span>40%</span>
      </ProgressRing>,
    );

    // Twelve o'clock is zero, so a quarter of the way round is due east.
    expect(Number(top.querySelector("line")?.getAttribute("x1"))).toBeCloseTo(60, 1);
    expect(Number(right.querySelector("line")?.getAttribute("x1"))).toBeGreaterThan(60);
  });
});
