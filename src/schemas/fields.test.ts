import { describe, expect, it } from "vitest";
import type { z } from "zod";

import { content } from "@/content/es";
import { NO_SELECTION } from "@/lib/ui/select-option";

import {
  amountField,
  blankAsZeroAmountField,
  checkboxField,
  idField,
  isoDateField,
  monthKeyField,
  optionalAmountField,
  optionalDayField,
  optionalIdField,
  optionalText,
  plannedAmountField,
  requiredText,
  sortOrderField,
  splitPercentField,
} from "./fields";

const UUID = "11111111-1111-4111-8111-111111111111";

/** Field builders are schemas in their own right, so they parse directly. */
function parse<T>(schema: z.ZodType<T>, value: unknown): T | string[] {
  const result = schema.safeParse(value);
  return result.success ? result.data : result.error.issues.map((issue) => issue.message);
}

describe("idField", () => {
  it("accepts a uuid", () => {
    expect(parse(idField, UUID)).toBe(UUID);
  });

  it("rejects anything else, in Spanish", () => {
    expect(parse(idField, "not-an-id")).toEqual([content.validation.idInvalid]);
  });
});

describe("amountField", () => {
  it("reads an amount typed with separators", () => {
    expect(parse(amountField, "1.500.000")).toBe(1_500_000);
    expect(parse(amountField, "$ 80.000")).toBe(80_000);
  });

  it("rejects an empty or unreadable amount", () => {
    expect(parse(amountField, "")).toEqual([content.validation.amountInvalid]);
    expect(parse(amountField, "abc")).toEqual([content.validation.amountInvalid]);
  });

  it("rejects zero and demands something positive", () => {
    expect(parse(amountField, "0")).toEqual([content.validation.amountPositive]);
  });

  it("rejects an amount beyond any believable household figure", () => {
    expect(parse(amountField, "1000000000000")).toEqual([content.validation.amountTooLarge]);
  });
});

describe("plannedAmountField", () => {
  it("allows zero, which is how a month opts out of a category", () => {
    expect(parse(plannedAmountField, "0")).toBe(0);
  });

  it("still rejects an unreadable amount", () => {
    expect(parse(plannedAmountField, "")).toEqual([content.validation.amountInvalid]);
  });

  it("rejects an absurd amount", () => {
    expect(parse(plannedAmountField, "1000000000000")).toEqual([content.validation.amountTooLarge]);
  });
});

describe("optionalAmountField", () => {
  it("treats blank as not set", () => {
    expect(parse(optionalAmountField, "")).toBeNull();
    expect(parse(optionalAmountField, "   ")).toBeNull();
    expect(parse(optionalAmountField, undefined)).toBeNull();
  });

  it("reads a value when one is given", () => {
    expect(parse(optionalAmountField, "5.000.000")).toBe(5_000_000);
  });

  it("rejects a value that cannot be read", () => {
    expect(parse(optionalAmountField, "abc")).toEqual([content.validation.amountInvalid]);
  });

  it("rejects zero, since a limit of nothing is not a limit", () => {
    expect(parse(optionalAmountField, "0")).toEqual([content.validation.amountPositive]);
  });
});

describe("blankAsZeroAmountField", () => {
  it("treats blank as zero, since most cards carry no starting debt", () => {
    expect(parse(blankAsZeroAmountField, "")).toBe(0);
    expect(parse(blankAsZeroAmountField, "   ")).toBe(0);
    expect(parse(blankAsZeroAmountField, undefined)).toBe(0);
  });

  it("reads a value, zero included", () => {
    expect(parse(blankAsZeroAmountField, "808.307")).toBe(808_307);
    expect(parse(blankAsZeroAmountField, "0")).toBe(0);
  });

  it("rejects text that cannot be read, a minus sign included", () => {
    expect(parse(blankAsZeroAmountField, "abc")).toEqual([content.validation.amountInvalid]);
    expect(parse(blankAsZeroAmountField, "-5000")).toEqual([content.validation.amountInvalid]);
  });
});

describe("isoDateField", () => {
  it("accepts a real date", () => {
    expect(parse(isoDateField, "2026-09-11")).toBe("2026-09-11");
  });

  it("rejects a date that does not exist", () => {
    expect(parse(isoDateField, "2026-02-30")).toEqual([content.validation.dateInvalid]);
    expect(parse(isoDateField, "")).toEqual([content.validation.dateInvalid]);
  });
});

describe("monthKeyField", () => {
  it("accepts a month key", () => {
    expect(parse(monthKeyField, "2026-09")).toBe("2026-09");
  });

  it("rejects anything else", () => {
    expect(parse(monthKeyField, "2026-09-01")).toEqual([content.validation.monthInvalid]);
  });
});

describe("optionalDayField", () => {
  it("treats blank as not set", () => {
    expect(parse(optionalDayField, "")).toBeNull();
    expect(parse(optionalDayField, undefined)).toBeNull();
  });

  it("accepts any day a month could have", () => {
    expect(parse(optionalDayField, "1")).toBe(1);
    expect(parse(optionalDayField, "31")).toBe(31);
  });

  it("rejects days outside the month", () => {
    expect(parse(optionalDayField, "0")).toEqual([content.validation.dayRange]);
    expect(parse(optionalDayField, "32")).toEqual([content.validation.dayRange]);
  });

  it("rejects something that is not a number at all", () => {
    expect(parse(optionalDayField, "quince")).toEqual([content.validation.dayRange]);
  });
});

describe("splitPercentField", () => {
  it("splits evenly when left blank", () => {
    expect(parse(splitPercentField, "")).toBe(50);
    expect(parse(splitPercentField, undefined)).toBe(50);
  });

  it("accepts any whole percentage, both ends included", () => {
    expect(parse(splitPercentField, "0")).toBe(0);
    expect(parse(splitPercentField, " 70 ")).toBe(70);
    expect(parse(splitPercentField, "100")).toBe(100);
  });

  it("rejects a percentage outside 0–100, a fraction or nonsense", () => {
    expect(parse(splitPercentField, "101")).toEqual([content.validation.splitRange]);
    expect(parse(splitPercentField, "-1")).toEqual([content.validation.splitRange]);
    expect(parse(splitPercentField, "33.5")).toEqual([content.validation.splitRange]);
    expect(parse(splitPercentField, "mitad")).toEqual([content.validation.splitRange]);
  });
});

describe("requiredText", () => {
  const field = requiredText(10);

  it("trims and keeps the text", () => {
    expect(parse(field, "  Agua  ")).toBe("Agua");
  });

  it("rejects an empty or whitespace-only value", () => {
    expect(parse(field, "")).toEqual([content.validation.required]);
    expect(parse(field, "   ")).toEqual([content.validation.required]);
  });

  it("rejects text beyond the limit", () => {
    expect(parse(field, "x".repeat(11))).toEqual([content.validation.textTooLong]);
  });
});

describe("optionalText", () => {
  const field = optionalText(10);

  it("stores an empty value as null rather than an empty string", () => {
    expect(parse(field, "")).toBeNull();
    expect(parse(field, "   ")).toBeNull();
    expect(parse(field, undefined)).toBeNull();
  });

  it("keeps text that was actually typed", () => {
    expect(parse(field, " nota ")).toBe("nota");
  });

  it("rejects text beyond the limit", () => {
    expect(parse(field, "x".repeat(11))).toEqual([content.validation.textTooLong]);
  });
});

describe("checkboxField", () => {
  it("is true only when the box was checked", () => {
    expect(parse(checkboxField, "on")).toBe(true);
    expect(parse(checkboxField, "true")).toBe(true);
  });

  it("is false when the box is absent, which is how forms post it", () => {
    expect(parse(checkboxField, undefined)).toBe(false);
    expect(parse(checkboxField, "off")).toBe(false);
  });
});

describe("optionalIdField", () => {
  it("accepts a uuid", () => {
    expect(parse(optionalIdField, UUID)).toBe(UUID);
  });

  it("treats blank and the no-selection sentinel as null", () => {
    expect(parse(optionalIdField, "")).toBeNull();
    expect(parse(optionalIdField, undefined)).toBeNull();
    expect(parse(optionalIdField, NO_SELECTION)).toBeNull();
  });

  it("rejects a value that is neither blank nor a uuid", () => {
    expect(parse(optionalIdField, "nope")).toEqual([content.validation.idInvalid]);
  });
});

describe("sortOrderField", () => {
  it("defaults a blank value to the front of the list", () => {
    expect(parse(sortOrderField, "")).toBe(0);
    expect(parse(sortOrderField, undefined)).toBe(0);
  });

  it("keeps a given position", () => {
    expect(parse(sortOrderField, "30")).toBe(30);
  });

  it("rejects a position that is not a whole number", () => {
    expect(parse(sortOrderField, "abc")).toEqual([content.validation.required]);
  });
});
