import { describe, expect, it } from "vitest";

import { barGeometry, buildBarScale } from "./bars";

describe("buildBarScale", () => {
  it("anchors the plot at zero when everything is positive", () => {
    expect(buildBarScale([2, 8, 5])).toEqual({ zeroLine: 0, span: 8 });
  });

  it("lifts the baseline to make room for negatives", () => {
    // From -4 to 8 is a span of 12, so zero sits a third of the way up.
    const scale = buildBarScale([-4, 8]);

    expect(scale.span).toBe(12);
    expect(scale.zeroLine).toBeCloseTo(33.33, 1);
  });

  it("keeps zero in range even when every value is negative", () => {
    expect(buildBarScale([-5, -2])).toEqual({ zeroLine: 100, span: 5 });
  });

  it("copes with a month where nothing has happened", () => {
    expect(buildBarScale([0, 0])).toEqual({ zeroLine: 0, span: 0 });
    expect(buildBarScale([])).toEqual({ zeroLine: 0, span: 0 });
  });
});

describe("barGeometry", () => {
  const scale = buildBarScale([-4, 8]);

  it("grows a positive bar upwards from the baseline", () => {
    const { base, height } = barGeometry(8, scale);

    expect(base).toBeCloseTo(scale.zeroLine, 5);
    expect(height).toBeCloseTo(66.67, 1);
  });

  it("hangs a negative bar below the baseline", () => {
    const { base, height } = barGeometry(-4, scale);

    expect(height).toBeCloseTo(33.33, 1);
    // Its lower edge is the bottom of the plot.
    expect(base).toBeCloseTo(0, 5);
  });

  it("scales a bar in proportion to its value, not to the smallest one", () => {
    const half = barGeometry(4, scale);
    const full = barGeometry(8, scale);

    expect(full.height).toBeCloseTo(half.height * 2, 5);
  });

  it("draws nothing at all when there is no range to draw in", () => {
    expect(barGeometry(0, buildBarScale([0]))).toEqual({ base: 0, height: 0 });
  });
});
