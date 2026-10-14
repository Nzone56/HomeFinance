import { describe, expect, it } from "vitest";

import { monthProgress } from "./pace";

describe("monthProgress", () => {
  it("counts the day itself as elapsed", () => {
    // 12 of 30 days in September.
    expect(monthProgress("2026-09", new Date(2026, 8, 12))).toBe(40);
  });

  it("reaches 100 on the last day of the month", () => {
    expect(monthProgress("2026-09", new Date(2026, 8, 30))).toBe(100);
  });

  it("does not treat the first day as nothing", () => {
    expect(monthProgress("2026-09", new Date(2026, 8, 1))).toBe(3);
  });

  it("uses the real length of a short month", () => {
    // 14 of 28 days in February 2026.
    expect(monthProgress("2026-02", new Date(2026, 1, 14))).toBe(50);
  });

  it("counts a month already gone as fully elapsed", () => {
    expect(monthProgress("2026-07", new Date(2026, 8, 12))).toBe(100);
  });

  it("counts a month not yet started as untouched", () => {
    expect(monthProgress("2026-12", new Date(2026, 8, 12))).toBe(0);
  });

  it("compares by month, not by day, across a year boundary", () => {
    expect(monthProgress("2025-12", new Date(2026, 0, 5))).toBe(100);
    expect(monthProgress("2026-01", new Date(2025, 11, 5))).toBe(0);
  });
});
