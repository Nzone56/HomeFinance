import { describe, expect, it } from "vitest";

import { seriesColor } from "./series";

describe("seriesColor", () => {
  it("gives each of the first slots its own colour", () => {
    const first = [0, 1, 2, 3, 4].map(seriesColor);

    expect(new Set(first).size).toBe(5);
  });

  it("keeps a series on the same slot every time it is asked", () => {
    expect(seriesColor(1)).toBe(seriesColor(1));
    expect(seriesColor(0)).toBe("var(--chart-1)");
  });

  it("cycles rather than inventing a new hue past the palette", () => {
    // A generated colour would be indistinguishable under colour blindness.
    expect(seriesColor(5)).toBe(seriesColor(0));
    expect(seriesColor(6)).toBe(seriesColor(1));
  });

  it("falls back to the first slot for an index outside the palette", () => {
    expect(seriesColor(-1)).toBe("var(--chart-1)");
  });
});
