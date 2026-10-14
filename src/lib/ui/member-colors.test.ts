import { describe, expect, it } from "vitest";

import { GF, JULIAN } from "@/test/factories";

import { buildMemberColors, memberColor } from "./member-colors";
import { seriesColor } from "./series";

describe("buildMemberColors", () => {
  it("gives each member their own slot, in household order", () => {
    const colors = buildMemberColors([{ userId: JULIAN }, { userId: GF }]);

    expect(colors.get(JULIAN)).toBe(seriesColor(0));
    expect(colors.get(GF)).toBe(seriesColor(1));
  });

  it("never gives two members the same colour", () => {
    const colors = buildMemberColors([{ userId: JULIAN }, { userId: GF }]);

    expect(new Set(colors.values()).size).toBe(2);
  });

  it("handles a household with no members loaded", () => {
    expect(buildMemberColors([]).size).toBe(0);
  });
});

describe("memberColor", () => {
  const colors = buildMemberColors([{ userId: JULIAN }, { userId: GF }]);

  it("returns the member's own slot", () => {
    expect(memberColor(colors, GF)).toBe(seriesColor(1));
  });

  it("falls back for a row with no person on it", () => {
    expect(memberColor(colors, null)).toBe(seriesColor(0));
  });

  it("falls back for a member this view never loaded", () => {
    // A deleted account still has rows pointing at it.
    expect(memberColor(colors, "someone-else")).toBe(seriesColor(0));
  });
});
