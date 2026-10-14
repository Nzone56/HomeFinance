import { describe, expect, it } from "vitest";

import { formatDayLabel, formatFullDate, formatMonthLabel, formatMonthLabelShort } from "./date";

describe("formatMonthLabel", () => {
  it("names the month in Spanish, capitalised", () => {
    expect(formatMonthLabel("2026-09")).toBe("Septiembre 2026");
    expect(formatMonthLabel("2026-01")).toBe("Enero 2026");
    expect(formatMonthLabel("2026-12")).toBe("Diciembre 2026");
  });
});

describe("formatMonthLabelShort", () => {
  it("abbreviates the month for tight layouts", () => {
    expect(formatMonthLabelShort("2026-09")).toBe("Sep 2026");
  });
});

describe("formatDayLabel", () => {
  it("shows day and abbreviated month", () => {
    expect(formatDayLabel("2026-09-11")).toBe("11 sep");
  });

  it("reads the stored day without a timezone shift", () => {
    expect(formatDayLabel("2026-09-01")).toBe("1 sep");
  });
});

describe("formatFullDate", () => {
  it("spells the date out in Spanish", () => {
    expect(formatFullDate("2026-09-11")).toBe("11 de septiembre de 2026");
  });
});
