import { describe, expect, it } from "vitest";

import { GF, JULIAN, makeCategory, makeCreditCard, makePaymentMethod } from "@/test/factories";

import { buildTransactionLabels, labelFor } from "./labels";

const categories = [makeCategory({ id: "rent", name: "Arriendo" })];
const methods = [
  makePaymentMethod({ id: "bank", name: "Bancolombia", user_id: JULIAN }),
  makeCreditCard({ id: "card", name: "TC1", user_id: GF }),
];
const members = [
  { userId: JULIAN, displayName: "Julián" },
  { userId: GF, displayName: "GF" },
];

describe("buildTransactionLabels", () => {
  it("indexes every name a transaction row needs", () => {
    const labels = buildTransactionLabels({ categories, paymentMethods: methods, members });

    expect(labels.categories.get("rent")).toBe("Arriendo");
    expect(labels.methods.get("card")).toBe("TC1");
    expect(labels.members.get(GF)).toBe("GF");
  });

  it("handles a household with nothing set up yet", () => {
    const labels = buildTransactionLabels({ categories: [], paymentMethods: [], members: [] });

    expect(labels.categories.size).toBe(0);
    expect(labels.methods.size).toBe(0);
    expect(labels.members.size).toBe(0);
  });

  it("leaves out the lookups a page never loaded", () => {
    // The income page reads no categories; the plan page reads only members.
    const labels = buildTransactionLabels({ members });

    expect(labels.members.get(JULIAN)).toBe("Julián");
    expect(labels.categories.size).toBe(0);
    expect(labels.methods.size).toBe(0);
  });
});

describe("labelFor", () => {
  const lookup = new Map([["rent", "Arriendo"]]);

  it("returns the name when the id is known", () => {
    expect(labelFor(lookup, "rent", "—")).toBe("Arriendo");
  });

  it("returns the fallback for an id it does not know", () => {
    expect(labelFor(lookup, "deleted", "—")).toBe("—");
  });

  it("returns the fallback for an absent reference", () => {
    // Income without an account, for instance.
    expect(labelFor(lookup, null, "Sin cuenta")).toBe("Sin cuenta");
  });
});
