import { MemberAvatar } from "@/components/people/member-avatar";
import { requireHouseholdContext } from "@/lib/data/household";
import { buildMemberColors, memberColor } from "@/lib/ui/member-colors";

/**
 * The two pieces of the header that depend on who is signed in.
 *
 * Server components of their own so the layout can stream them rather than wait
 * for them. Both read the same request-cached household context the page does,
 * so they cost no extra queries.
 */

export async function HouseholdName() {
  const { household } = await requireHouseholdContext();
  return <>{household.name}</>;
}

export async function SignedInMember() {
  const { members, userId } = await requireHouseholdContext();
  const me = members.find((member) => member.userId === userId);

  return (
    <MemberAvatar
      name={me === undefined ? "" : me.displayName}
      color={memberColor(buildMemberColors(members), userId)}
      labelled
    />
  );
}
