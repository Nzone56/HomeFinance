import { describe, expect, it } from "vitest";

import { initials } from "./name";

describe("initials", () => {
  it("takes one letter from each of the first two words", () => {
    expect(initials("Julián Pereira")).toBe("JP");
  });

  it("takes a single letter from a single name", () => {
    expect(initials("Julián")).toBe("J");
  });

  it("stops at two letters however long the name is", () => {
    expect(initials("María Fernanda Gómez Rojas")).toBe("MF");
  });

  it("copes with stray spacing", () => {
    expect(initials("  julián   pereira  ")).toBe("JP");
  });

  it("still marks a member who has not set a name yet", () => {
    // An invited account renders before its profile is filled in.
    expect(initials("")).toBe("?");
    expect(initials("   ")).toBe("?");
  });
});
