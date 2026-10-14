import type { ExpenseRow } from "@/types/database";

import { splitByWeights } from "./money";
import { amountFor } from "./transactions";

/** A household member, as far as splitting an expense is concerned. */
export interface Member {
  userId: string;
  displayName: string;
}

/** Half each — what a shared expense starts from. */
export const EVEN_SPLIT_PERCENT = 50;

type SplittableExpense = Pick<ExpenseRow, "amount" | "shared" | "user_id" | "payer_share_percent">;

/** One member's part of one expense. */
export interface ExpenseCharge {
  userId: string;
  amount: number;
  shared: boolean;
}

/**
 * Who carries an expense, and how much of it each.
 *
 * A personal expense is entirely the payer's. A shared one is divided by its
 * own percentage: `payer_share_percent` belongs to whoever paid and the rest to
 * the other member. Nobody owes anybody for it — each person's part simply
 * counts as their spending, whichever card it went on.
 *
 * The split goes through `splitByWeights`, so the parts always add back up to
 * the amount. With a payer alone in the household there is nobody to share
 * with, and the whole amount stays with them.
 */
export function chargesFor(
  expense: SplittableExpense,
  members: readonly Member[],
): ExpenseCharge[] {
  const others = members.filter((member) => member.userId !== expense.user_id);

  if (!expense.shared || others.length === 0) {
    return [{ userId: expense.user_id, amount: expense.amount, shared: expense.shared }];
  }

  // Weighted so the payer gets exactly their percentage however many others
  // there are, and the others divide the rest evenly.
  const parties = [
    { userId: expense.user_id, weight: expense.payer_share_percent * others.length },
    ...others.map((member) => ({
      userId: member.userId,
      weight: 100 - expense.payer_share_percent,
    })),
  ];

  return splitByWeights(expense.amount, parties, (party) => party.weight).map(
    ({ item, share }) => ({ userId: item.userId, amount: share, shared: true }),
  );
}

/** What one member carries across a set of expenses. */
export interface MemberSpend {
  userId: string;
  displayName: string;
  /** Their part of the shared expenses. */
  shared: number;
  /** Expenses that were only theirs. */
  personal: number;
  total: number;
}

/**
 * Each member's spending: their personal expenses plus their part of every
 * shared one. A member with nothing recorded gets a row of zeroes.
 */
export function buildMemberSpend(
  members: readonly Member[],
  expenses: readonly SplittableExpense[],
): MemberSpend[] {
  const shared = new Map<string, number>();
  const personal = new Map<string, number>();

  for (const expense of expenses) {
    for (const charge of chargesFor(expense, members)) {
      const totals = charge.shared ? shared : personal;
      totals.set(charge.userId, amountFor(totals, charge.userId) + charge.amount);
    }
  }

  return members.map((member) => {
    const sharedAmount = amountFor(shared, member.userId);
    const personalAmount = amountFor(personal, member.userId);
    return {
      userId: member.userId,
      displayName: member.displayName,
      shared: sharedAmount,
      personal: personalAmount,
      total: sharedAmount + personalAmount,
    };
  });
}
