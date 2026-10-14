import { seriesColor } from "./series";

/** Each member's categorical slot, keyed by user id. */
export type MemberColors = ReadonlyMap<string, string>;

/** Shown for a member the current view never loaded — a deleted account, say. */
const UNKNOWN_MEMBER_COLOR = seriesColor(0);

/**
 * One colour per person, assigned by household order.
 *
 * Order — not a hash of the id — is what makes the assignment stable and
 * collision-free, and it is why the avatar beside a name matches the bar in
 * "quién puso qué" and the segment in every chart. Colour follows the person,
 * never their rank in whatever list is on screen.
 */
export function buildMemberColors(members: readonly { userId: string }[]): Map<string, string> {
  return new Map(members.map((member, index) => [member.userId, seriesColor(index)]));
}

export function memberColor(colors: MemberColors, userId: string | null): string {
  if (userId === null) {
    return UNKNOWN_MEMBER_COLOR;
  }
  return colors.get(userId) ?? UNKNOWN_MEMBER_COLOR;
}
