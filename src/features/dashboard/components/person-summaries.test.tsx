import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { content } from "@/content/es";
import { buildPersonSummaries } from "@/lib/calculations/people";
import { buildMemberColors } from "@/lib/ui/member-colors";
import { GF, JULIAN } from "@/test/factories";

import { PersonSummaries } from "./person-summaries";

const members = [
  { userId: JULIAN, displayName: "Julián" },
  { userId: GF, displayName: "GF" },
];

const colors = buildMemberColors(members);

const people = buildPersonSummaries(
  members,
  [
    { userId: JULIAN, actual: 4_000_000 },
    { userId: GF, actual: 2_000_000 },
  ],
  [
    { userId: JULIAN, spent: 1_000_000, spentShared: 800_000, spentPersonal: 200_000 },
    { userId: GF, spent: 2_500_000, spentShared: 2_500_000, spentPersonal: 0 },
  ],
);

const blockFor = (name: string) =>
  screen.getAllByRole("listitem").find((item) => within(item).queryByText(name) !== null);

describe("PersonSummaries", () => {
  it("gives each person their own ring", () => {
    render(<PersonSummaries people={people} colors={colors} />);

    expect(screen.getByRole("img", { name: "Julián" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "GF" })).toBeInTheDocument();
  });

  it("leads with how much of their income has gone", () => {
    render(<PersonSummaries people={people} colors={colors} />);

    // 1.000.000 of 4.000.000, and 2.500.000 of 2.000.000.
    expect(screen.getByText("25%")).toBeInTheDocument();
    expect(screen.getByText("125%")).toBeInTheDocument();
    expect(screen.getAllByText(content.dashboard.ofIncomeSpent)).toHaveLength(2);
  });

  it("names every figure in the legend beside the ring", () => {
    render(<PersonSummaries people={people} colors={colors} />);

    const block = blockFor("Julián");

    expect(within(block as HTMLElement).getByText(content.dashboard.income)).toBeInTheDocument();
    expect(within(block as HTMLElement).getByText("$ 4.000.000")).toBeInTheDocument();
    expect(within(block as HTMLElement).getByText("$ 1.000.000")).toBeInTheDocument();
  });

  it("splits what they paid into the household's part and their own", () => {
    render(<PersonSummaries people={people} colors={colors} />);

    const block = blockFor("Julián");

    expect(
      within(block as HTMLElement).getByText(content.dashboard.personShared),
    ).toBeInTheDocument();
    expect(within(block as HTMLElement).getByText("$ 800.000")).toBeInTheDocument();
    expect(within(block as HTMLElement).getByText("$ 200.000")).toBeInTheDocument();
  });

  it("shows what is left to them", () => {
    render(<PersonSummaries people={people} colors={colors} />);

    const block = blockFor("Julián");

    expect(within(block as HTMLElement).getByText("$ 3.000.000")).toHaveClass("text-emerald-600");
  });

  it("reads spending past their income as the bad news it is", () => {
    render(<PersonSummaries people={people} colors={colors} />);

    const block = blockFor("GF");

    expect(within(block as HTMLElement).getByText("-$ 500.000")).toHaveClass("text-destructive");
  });

  it("never shows a balance owed between the two", () => {
    render(<PersonSummaries people={people} colors={colors} />);

    expect(screen.queryByText("Saldo")).not.toBeInTheDocument();
  });

  it("says so when someone has recorded no income this month", () => {
    const quiet = buildPersonSummaries(
      [{ userId: JULIAN, displayName: "Julián" }],
      [],
      [{ userId: JULIAN, spent: 80_000, spentShared: 80_000, spentPersonal: 0 }],
    );

    render(<PersonSummaries people={quiet} colors={colors} />);

    expect(screen.getByText(content.dashboard.personIncomeEmpty)).toBeInTheDocument();
  });

  it("keeps each person's figures packed to the top, whether or not the other has a note (regression)", () => {
    // The two columns share a row height; the one without the "no income" line
    // used to spread its rows apart to fill it.
    render(<PersonSummaries people={people} colors={colors} />);

    for (const item of screen.getAllByRole("listitem")) {
      expect(item).toHaveClass("content-start");
    }
  });

  it("keeps quiet about missing income when there is some", () => {
    render(<PersonSummaries people={people} colors={colors} />);

    expect(screen.queryByText(content.dashboard.personIncomeEmpty)).not.toBeInTheDocument();
  });
});
