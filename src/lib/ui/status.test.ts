import { describe, expect, it } from "vitest";

import { spendStatus, statusFill } from "./status";

describe("spendStatus", () => {
  it("is comfortable well inside the limit", () => {
    expect(spendStatus(0)).toBe("good");
    expect(spendStatus(84)).toBe("good");
  });

  it("warns as the limit comes into view", () => {
    expect(spendStatus(85)).toBe("warning");
    expect(spendStatus(99)).toBe("warning");
  });

  it("is critical at the limit and past it", () => {
    expect(spendStatus(100)).toBe("critical");
    expect(spendStatus(250)).toBe("critical");
  });
});

describe("statusFill", () => {
  it("gives each state its own reserved colour", () => {
    const fills = [statusFill("good"), statusFill("warning"), statusFill("critical")];

    expect(new Set(fills).size).toBe(3);
  });

  it("draws from the status tokens, never a series colour", () => {
    // A red meter must always mean "over", never "category 4".
    expect(statusFill("good")).toBe("var(--status-good)");
    expect(statusFill("warning")).toBe("var(--status-warning)");
    expect(statusFill("critical")).toBe("var(--status-critical)");
  });
});
