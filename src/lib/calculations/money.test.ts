import { describe, expect, it } from "vitest";

import { difference, overspend, percentageOf, splitByWeights, sumAmounts, sumBy } from "./money";

const shares = (total: number, weights: number[]) =>
  splitByWeights(total, weights, (weight) => weight).map((entry) => entry.share);

describe("sumAmounts", () => {
  it("adds every value", () => {
    expect(sumAmounts([80_000, 230_000, 120_000])).toBe(430_000);
  });

  it("treats an empty list as zero", () => {
    expect(sumAmounts([])).toBe(0);
  });

  it("handles negative values", () => {
    expect(sumAmounts([100, -250])).toBe(-150);
  });
});

describe("sumBy", () => {
  it("adds the selected field", () => {
    expect(sumBy([{ amount: 5 }, { amount: 7 }], (item) => item.amount)).toBe(12);
  });

  it("treats an empty list as zero", () => {
    expect(sumBy([], (item: { amount: number }) => item.amount)).toBe(0);
  });
});

describe("splitByWeights", () => {
  it("splits evenly between two equal weights", () => {
    expect(shares(1_000_000, [1, 1])).toEqual([500_000, 500_000]);
  });

  it("splits by proportion when weights differ", () => {
    expect(shares(1_000_000, [3, 2])).toEqual([600_000, 400_000]);
  });

  it("never loses a peso to rounding", () => {
    const result = shares(1_000_001, [1, 1]);

    expect(result).toEqual([500_001, 500_000]);
    expect(sumAmounts(result)).toBe(1_000_001);
  });

  it("hands leftover pesos to the largest remainders first", () => {
    const result = shares(10, [1, 1, 1]);

    expect(sumAmounts(result)).toBe(10);
    expect(result).toEqual([4, 3, 3]);
  });

  it("breaks remainder ties by position, so the result is deterministic", () => {
    expect(shares(7, [1, 1, 1])).toEqual([3, 2, 2]);
    expect(shares(7, [1, 1, 1])).toEqual(shares(7, [1, 1, 1]));
  });

  it("returns nothing for an empty set", () => {
    expect(shares(1000, [])).toEqual([]);
  });

  it("gives everyone zero when the weights carry no information", () => {
    expect(shares(1000, [0, 0])).toEqual([0, 0]);
  });

  it("splits zero into zeroes", () => {
    expect(shares(0, [1, 1])).toEqual([0, 0]);
  });

  it("splits a negative total without losing a peso", () => {
    const result = shares(-1_000_001, [1, 1]);

    expect(result).toEqual([-500_001, -500_000]);
    expect(sumAmounts(result)).toBe(-1_000_001);
  });

  it("pairs each share with the item it belongs to", () => {
    const members = [
      { name: "Julián", weight: 3 },
      { name: "GF", weight: 2 },
    ];

    expect(splitByWeights(1_000_000, members, (member) => member.weight)).toEqual([
      { item: members[0], share: 600_000 },
      { item: members[1], share: 400_000 },
    ]);
  });
});

describe("overspend", () => {
  it("reports how far past the plan actual spending went", () => {
    expect(overspend(800_000, 920_000)).toBe(120_000);
  });

  it("reports zero when spending stayed within the plan", () => {
    expect(overspend(800_000, 700_000)).toBe(0);
    expect(overspend(800_000, 800_000)).toBe(0);
  });
});

describe("difference", () => {
  it("is positive when actual exceeds planned", () => {
    expect(difference(800_000, 920_000)).toBe(120_000);
  });

  it("is negative when actual falls short", () => {
    expect(difference(8_000_000, 7_400_000)).toBe(-600_000);
  });
});

describe("percentageOf", () => {
  it("expresses actual as a share of planned", () => {
    expect(percentageOf(270_000, 300_000)).toBe(90);
    expect(percentageOf(920_000, 800_000)).toBe(115);
  });

  it("rounds to a whole percent", () => {
    expect(percentageOf(1, 3)).toBe(33);
  });

  it("treats any spending against a zero plan as fully consumed", () => {
    expect(percentageOf(50_000, 0)).toBe(100);
    expect(percentageOf(50_000, -10)).toBe(100);
  });

  it("reports zero when nothing was planned and nothing was spent", () => {
    expect(percentageOf(0, 0)).toBe(0);
  });
});
