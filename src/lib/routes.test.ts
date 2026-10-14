import { describe, expect, it } from "vitest";

import { ROUTES, toRoute, withMonth } from "./routes";

describe("ROUTES", () => {
  it("names every top-level destination", () => {
    expect(Object.values(ROUTES)).toEqual([
      "/dashboard",
      "/expenses",
      "/income",
      "/budget",
      "/settings",
    ]);
  });
});

describe("toRoute", () => {
  it("appends a query string", () => {
    expect(toRoute("/dashboard", new URLSearchParams({ month: "2026-09" }))).toBe(
      "/dashboard?month=2026-09",
    );
  });

  it("leaves the path bare when there are no params", () => {
    expect(toRoute("/dashboard", new URLSearchParams())).toBe("/dashboard");
  });
});

describe("withMonth", () => {
  it("puts the month in the query string", () => {
    expect(withMonth("/expenses", "2026-09")).toBe("/expenses?month=2026-09");
  });

  it("replaces a month already present", () => {
    expect(withMonth("/expenses", "2026-10", new URLSearchParams({ month: "2026-09" }))).toBe(
      "/expenses?month=2026-10",
    );
  });

  it("keeps other params intact", () => {
    expect(withMonth("/expenses", "2026-10", new URLSearchParams({ tab: "transfers" }))).toBe(
      "/expenses?tab=transfers&month=2026-10",
    );
  });
});
