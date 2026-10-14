import { describe, expect, it } from "vitest";

import { GF, JULIAN } from "@/test/factories";

import { buildPersonSummaries } from "./people";

const members = [
  { userId: JULIAN, displayName: "Julián" },
  { userId: GF, displayName: "GF" },
];

const incomes = [
  { userId: JULIAN, actual: 4_000_000 },
  { userId: GF, actual: 2_000_000 },
];

const spending = [
  { userId: JULIAN, spent: 1_000_000, spentShared: 800_000, spentPersonal: 200_000 },
  { userId: GF, spent: 500_000, spentShared: 500_000, spentPersonal: 0 },
];

const summaryFor = (userId: string) =>
  buildPersonSummaries(members, incomes, spending).find((person) => person.userId === userId);

describe("buildPersonSummaries", () => {
  it("gives every member a row, in household order", () => {
    const people = buildPersonSummaries(members, incomes, spending);

    expect(people.map((person) => person.displayName)).toEqual(["Julián", "GF"]);
  });

  it("reports what came in and what they spent", () => {
    expect(summaryFor(JULIAN)).toMatchObject({ income: 4_000_000, spent: 1_000_000 });
  });

  it("splits what they spent into their part of the household and their own", () => {
    expect(summaryFor(JULIAN)).toMatchObject({
      spentShared: 800_000,
      spentPersonal: 200_000,
    });
  });

  it("leaves them what their income did not have to cover", () => {
    expect(summaryFor(JULIAN)?.available).toBe(3_000_000);
  });

  it("works out how much of their income has gone", () => {
    expect(summaryFor(JULIAN)?.spentPercentage).toBe(25);
    expect(summaryFor(GF)?.spentPercentage).toBe(25);
  });

  it("goes past 100% when the month is funded from something else", () => {
    const people = buildPersonSummaries(
      members,
      [{ userId: JULIAN, actual: 1_000_000 }],
      [{ userId: JULIAN, spent: 1_400_000, spentShared: 0, spentPersonal: 1_400_000 }],
    );

    expect(people.at(0)).toMatchObject({ spentPercentage: 140, available: -400_000 });
  });

  it("gives a member with nothing recorded a row of zeroes rather than dropping them", () => {
    const people = buildPersonSummaries(members, [], []);

    expect(people).toHaveLength(2);
    expect(people.at(1)).toEqual({
      userId: GF,
      displayName: "GF",
      income: 0,
      spent: 0,
      spentShared: 0,
      spentPersonal: 0,
      available: 0,
      spentPercentage: 0,
    });
  });

  it("reads spending with no income behind it as everything gone", () => {
    const people = buildPersonSummaries(
      [{ userId: JULIAN, displayName: "Julián" }],
      [],
      [{ userId: JULIAN, spent: 80_000, spentShared: 80_000, spentPersonal: 0 }],
    );

    expect(people.at(0)).toMatchObject({ spentPercentage: 100, available: -80_000 });
  });

  it("returns nothing for a household with no members loaded", () => {
    expect(buildPersonSummaries([], incomes, spending)).toEqual([]);
  });
});
