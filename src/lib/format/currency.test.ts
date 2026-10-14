import { describe, expect, it } from "vitest";

import { formatCop, formatCopCompact, formatSignedCop, parseAmountInput } from "./currency";

describe("formatCop", () => {
  it("formats pesos with Colombian separators and no cents", () => {
    expect(formatCop(80_000)).toBe("$ 80.000");
    expect(formatCop(1_500_000)).toBe("$ 1.500.000");
  });

  it("formats zero", () => {
    expect(formatCop(0)).toBe("$ 0");
  });

  it("formats a negative amount", () => {
    expect(formatCop(-500_000)).toBe("-$ 500.000");
  });

  it("uses a plain space, never a non-breaking one", () => {
    expect(formatCop(80_000)).not.toContain(" ");
  });
});

describe("formatCopCompact", () => {
  it("shortens large amounts", () => {
    expect(formatCopCompact(7_400_000)).toBe("$7,4 M");
    expect(formatCopCompact(80_000)).toBe("$80 K");
    expect(formatCopCompact(160_000)).toBe("$160 K");
    expect(formatCopCompact(2_500_000_000)).toBe("$2,5 MM");
  });

  it("shows small amounts in full rather than losing precision", () => {
    expect(formatCopCompact(0)).toBe("$ 0");
    expect(formatCopCompact(950)).toBe("$ 950");
  });

  it("is identical in Node and the browser, so hydration never disagrees", () => {
    // Intl compact notation renders "K" on Node and "k" on Chrome, which put
    // the same figure on screen two different ways. This builds the unit itself.
    expect(formatCopCompact(160_000)).toContain(" K");
    expect(formatCopCompact(160_000)).not.toContain(" k");
  });

  it("shortens negative amounts", () => {
    expect(formatCopCompact(-500_000)).toBe("-$500 K");
  });
});

describe("formatSignedCop", () => {
  it("marks a surplus with a plus sign", () => {
    expect(formatSignedCop(500_000)).toBe("+$ 500.000");
  });

  it("leaves the minus sign to the formatter", () => {
    expect(formatSignedCop(-600_000)).toBe("-$ 600.000");
  });

  it("does not sign zero", () => {
    expect(formatSignedCop(0)).toBe("$ 0");
  });
});

describe("parseAmountInput", () => {
  it("reads a plain number", () => {
    expect(parseAmountInput("1500000")).toBe(1_500_000);
  });

  it("reads a number typed with thousand separators", () => {
    expect(parseAmountInput("1.500.000")).toBe(1_500_000);
    expect(parseAmountInput("$ 1.500.000")).toBe(1_500_000);
  });

  it("reads zero", () => {
    expect(parseAmountInput("0")).toBe(0);
  });

  it("returns null when there is nothing to read", () => {
    expect(parseAmountInput("")).toBeNull();
    expect(parseAmountInput("   ")).toBeNull();
    expect(parseAmountInput("abc")).toBeNull();
  });

  it("refuses a negative amount rather than silently dropping the sign", () => {
    expect(parseAmountInput("-5000")).toBeNull();
    expect(parseAmountInput("$ -5.000")).toBeNull();
  });

  it("refuses a number too large to stay exact", () => {
    expect(parseAmountInput("9".repeat(20))).toBeNull();
  });
});
