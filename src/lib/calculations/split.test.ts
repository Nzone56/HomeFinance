import { describe, expect, it } from "vitest";

import { GF, JULIAN, makeCouple, makeExpense } from "@/test/factories";

import { buildMemberSpend, chargesFor, EVEN_SPLIT_PERCENT } from "./split";

const couple = makeCouple();

describe("chargesFor", () => {
  it("splits a shared expense half and half by default", () => {
    expect(EVEN_SPLIT_PERCENT).toBe(50);

    expect(chargesFor(makeExpense({ user_id: JULIAN, amount: 200_000 }), couple)).toEqual([
      { userId: JULIAN, amount: 100_000, shared: true },
      { userId: GF, amount: 100_000, shared: true },
    ]);
  });

  it("follows the expense's own percentage", () => {
    const rent = makeExpense({ user_id: GF, amount: 1_000_000, payer_share_percent: 70 });

    expect(chargesFor(rent, couple)).toEqual([
      { userId: GF, amount: 700_000, shared: true },
      { userId: JULIAN, amount: 300_000, shared: true },
    ]);
  });

  it("never loses or invents a peso on an odd amount", () => {
    const charges = chargesFor(makeExpense({ user_id: JULIAN, amount: 100_001 }), couple);

    expect(charges.map((charge) => charge.amount)).toEqual([50_001, 50_000]);
  });

  it("can put a shared expense entirely on the other person", () => {
    const gift = makeExpense({ user_id: JULIAN, amount: 90_000, payer_share_percent: 0 });

    expect(chargesFor(gift, couple)).toEqual([
      { userId: JULIAN, amount: 0, shared: true },
      { userId: GF, amount: 90_000, shared: true },
    ]);
  });

  it("puts a personal expense entirely on whoever paid, whatever its percentage", () => {
    const shoes = makeExpense({ user_id: GF, amount: 250_000, shared: false });

    expect(chargesFor(shoes, couple)).toEqual([{ userId: GF, amount: 250_000, shared: false }]);
  });

  it("keeps a shared expense with the payer when there is nobody to share it with", () => {
    const alone = [{ userId: JULIAN, displayName: "Julián" }];

    expect(chargesFor(makeExpense({ user_id: JULIAN, amount: 80_000 }), alone)).toEqual([
      { userId: JULIAN, amount: 80_000, shared: true },
    ]);
  });
});

describe("buildMemberSpend", () => {
  it("adds each person's part of the shared expenses to their own", () => {
    const spend = buildMemberSpend(couple, [
      makeExpense({ user_id: JULIAN, amount: 1_000_000, payer_share_percent: 60 }),
      makeExpense({ user_id: GF, amount: 200_000 }),
      makeExpense({ user_id: GF, amount: 150_000, shared: false }),
    ]);

    expect(spend).toEqual([
      { userId: JULIAN, displayName: "Julián", shared: 700_000, personal: 0, total: 700_000 },
      { userId: GF, displayName: "GF", shared: 500_000, personal: 150_000, total: 650_000 },
    ]);
  });

  it("gives a member with nothing recorded a row of zeroes", () => {
    expect(buildMemberSpend(couple, [])).toEqual([
      { userId: JULIAN, displayName: "Julián", shared: 0, personal: 0, total: 0 },
      { userId: GF, displayName: "GF", shared: 0, personal: 0, total: 0 },
    ]);
  });

  it("adds up to exactly what the household spent", () => {
    const expenses = [
      makeExpense({ user_id: JULIAN, amount: 333_333, payer_share_percent: 33 }),
      makeExpense({ user_id: GF, amount: 77_777 }),
      makeExpense({ user_id: GF, amount: 1_001, shared: false }),
    ];

    const total = buildMemberSpend(couple, expenses).reduce((sum, row) => sum + row.total, 0);

    expect(total).toBe(333_333 + 77_777 + 1_001);
  });
});
