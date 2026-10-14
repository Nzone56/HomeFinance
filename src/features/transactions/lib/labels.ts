import { buildMemberColors } from "@/lib/ui/member-colors";
import type { CategoryRow, PaymentMethodRow } from "@/types/database";

/**
 * Transactions store foreign keys; lists have to show names. These lookups are
 * built once per render and shared by every row, rather than each row scanning
 * the arrays for itself.
 */
export interface TransactionLabels {
  categories: Map<string, string>;
  methods: Map<string, string>;
  members: Map<string, string>;
  /** Each member's categorical slot, so a row can show their avatar. */
  memberColors: Map<string, string>;
}

/**
 * Every source is optional: a page only loads the reference data it shows, so
 * the income page has no categories and the plan page has only members. A
 * missing source yields an empty lookup, and `labelFor` falls back.
 */
export interface TransactionLabelSources {
  categories?: readonly CategoryRow[];
  paymentMethods?: readonly PaymentMethodRow[];
  members?: readonly { userId: string; displayName: string }[];
}

export function buildTransactionLabels({
  categories = [],
  paymentMethods = [],
  members = [],
}: TransactionLabelSources): TransactionLabels {
  return {
    categories: new Map(categories.map((category) => [category.id, category.name])),
    methods: new Map(paymentMethods.map((method) => [method.id, method.name])),
    members: new Map(members.map((member) => [member.userId, member.displayName])),
    memberColors: buildMemberColors(members),
  };
}

/**
 * A name for an id, or the fallback. Deleted or not-yet-loaded references show
 * the fallback instead of a raw uuid.
 */
export function labelFor(
  lookup: ReadonlyMap<string, string>,
  id: string | null,
  fallback: string,
): string {
  if (id === null) {
    return fallback;
  }
  return lookup.get(id) ?? fallback;
}
