import { describe, expect, it } from "vitest";

import {
  clampDayToMonth,
  currentMonthKey,
  formatIsoDate,
  isIsoDate,
  isMonthKey,
  isoDateToMonthKey,
  monthKeyToDate,
  monthKeyToIsoDate,
  parseDateOnly,
  resolveMonthKey,
  shiftMonthKey,
  toMonthKey,
} from "./month";

describe("isMonthKey", () => {
  it("accepts a well-formed month key", () => {
    expect(isMonthKey("2026-09")).toBe(true);
    expect(isMonthKey("2026-01")).toBe(true);
    expect(isMonthKey("2026-12")).toBe(true);
  });

  it("rejects months outside 01-12", () => {
    expect(isMonthKey("2026-00")).toBe(false);
    expect(isMonthKey("2026-13")).toBe(false);
  });

  it("rejects anything that is not exactly yyyy-MM", () => {
    expect(isMonthKey("")).toBe(false);
    expect(isMonthKey("2026-9")).toBe(false);
    expect(isMonthKey("2026-09-01")).toBe(false);
    expect(isMonthKey("septiembre")).toBe(false);
  });
});

describe("isIsoDate", () => {
  it("accepts a real calendar date", () => {
    expect(isIsoDate("2026-09-11")).toBe(true);
    expect(isIsoDate("2024-02-29")).toBe(true);
  });

  it("rejects a malformed date", () => {
    expect(isIsoDate("2026-9-1")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-09-32")).toBe(false);
  });

  it("rejects a well-formed date that does not exist", () => {
    expect(isIsoDate("2026-02-30")).toBe(false);
  });
});

describe("month key conversions", () => {
  it("derives a month key from a date", () => {
    expect(toMonthKey(new Date(2026, 8, 11))).toBe("2026-09");
  });

  it("expands a month key to the first day of that month", () => {
    expect(monthKeyToIsoDate("2026-09")).toBe("2026-09-01");
    expect(formatIsoDate(monthKeyToDate("2026-09"))).toBe("2026-09-01");
  });

  it("reads the month straight off a stored date", () => {
    expect(isoDateToMonthKey("2026-09-11")).toBe("2026-09");
    expect(isoDateToMonthKey("2026-12-31")).toBe("2026-12");
  });

  it("uses the reference date for the current month", () => {
    expect(currentMonthKey(new Date(2027, 0, 3))).toBe("2027-01");
  });
});

describe("parseDateOnly", () => {
  it("reads a date column at local midnight, not UTC", () => {
    const parsed = parseDateOnly("2026-09-11");

    // Read as UTC this would roll back to the 10th anywhere west of Greenwich.
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(8);
    expect(parsed.getDate()).toBe(11);
    expect(parsed.getHours()).toBe(0);
  });

  it("round-trips through formatIsoDate", () => {
    expect(formatIsoDate(parseDateOnly("2026-01-31"))).toBe("2026-01-31");
  });
});

describe("shiftMonthKey", () => {
  it("moves forward and backward within a year", () => {
    expect(shiftMonthKey("2026-09", 1)).toBe("2026-10");
    expect(shiftMonthKey("2026-09", -1)).toBe("2026-08");
  });

  it("crosses year boundaries in both directions", () => {
    expect(shiftMonthKey("2026-12", 1)).toBe("2027-01");
    expect(shiftMonthKey("2026-01", -1)).toBe("2025-12");
  });

  it("handles multi-month jumps", () => {
    expect(shiftMonthKey("2026-09", 12)).toBe("2027-09");
    expect(shiftMonthKey("2026-09", 0)).toBe("2026-09");
  });
});

describe("resolveMonthKey", () => {
  const fallback = "2026-09";

  it("keeps a valid candidate", () => {
    expect(resolveMonthKey("2026-03", fallback)).toBe("2026-03");
  });

  it("falls back when nothing was supplied", () => {
    expect(resolveMonthKey(undefined, fallback)).toBe("2026-09");
    expect(resolveMonthKey(null, fallback)).toBe("2026-09");
  });

  it("falls back when the candidate is unusable", () => {
    expect(resolveMonthKey("not-a-month", fallback)).toBe("2026-09");
    expect(resolveMonthKey("2026-99", fallback)).toBe("2026-09");
  });
});

describe("clampDayToMonth", () => {
  it("keeps a day that exists in the month", () => {
    expect(formatIsoDate(clampDayToMonth(new Date(2026, 8, 1), 15))).toBe("2026-09-15");
  });

  it("clamps to the last day of a short month", () => {
    expect(formatIsoDate(clampDayToMonth(new Date(2026, 1, 1), 31))).toBe("2026-02-28");
    expect(formatIsoDate(clampDayToMonth(new Date(2026, 8, 1), 31))).toBe("2026-09-30");
  });

  it("respects a leap year", () => {
    expect(formatIsoDate(clampDayToMonth(new Date(2024, 1, 1), 31))).toBe("2024-02-29");
  });
});
