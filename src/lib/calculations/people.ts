import { percentageOf } from "./money";

/** What one person's month looks like, from their own side of it. */
export interface PersonSummary {
  userId: string;
  displayName: string;
  /** What actually arrived for them this month. */
  income: number;
  /** What they carry this month: their personal expenses plus their part of the shared ones. */
  spent: number;
  /** Of that, their part of the shared expenses. */
  spentShared: number;
  /** And the expenses that were only theirs. */
  spentPersonal: number;
  /** Income less what they spent. Negative when they spent more than came in. */
  available: number;
  /**
   * How much of their income has gone, 0–100 and beyond.
   *
   * Past 100 they are funding the month from something other than this month's
   * income, which is exactly the thing worth seeing at a glance.
   */
  spentPercentage: number;
}

/**
 * A member's figures, structurally rather than by importing the row types they
 * come from — which keeps this out of an import cycle with the dashboard.
 */
interface IncomeFigure {
  userId: string;
  actual: number;
}

interface SpendFigure {
  userId: string;
  spent: number;
  spentShared: number;
  spentPersonal: number;
}

/**
 * A member with nothing recorded still gets a row of zeroes rather than being
 * dropped: "you have spent nothing this month" is an answer, and a household
 * where one person disappears from the summary is not.
 */
function numberFor(values: ReadonlyMap<string, number>, userId: string): number {
  const value = values.get(userId);
  return value === undefined ? 0 : value;
}

/**
 * The month from each person's own side: what came in, what they spent, and
 * what that leaves them.
 *
 * "Spent" is their part of the month — personal expenses plus their percentage
 * of every shared one — not what happened to go through their card. Shared
 * expenses create no debt between the two, so there is no balance to carry.
 */
export function buildPersonSummaries(
  members: readonly { userId: string; displayName: string }[],
  incomes: readonly IncomeFigure[],
  spending: readonly SpendFigure[],
): PersonSummary[] {
  const incomeByUser = new Map(incomes.map((row) => [row.userId, row.actual]));
  const spentByUser = new Map(spending.map((row) => [row.userId, row.spent]));
  const sharedByUser = new Map(spending.map((row) => [row.userId, row.spentShared]));
  const personalByUser = new Map(spending.map((row) => [row.userId, row.spentPersonal]));

  return members.map((member) => {
    const income = numberFor(incomeByUser, member.userId);
    const spent = numberFor(spentByUser, member.userId);

    return {
      userId: member.userId,
      displayName: member.displayName,
      income,
      spent,
      spentShared: numberFor(sharedByUser, member.userId),
      spentPersonal: numberFor(personalByUser, member.userId),
      available: income - spent,
      spentPercentage: percentageOf(spent, income),
    };
  });
}
