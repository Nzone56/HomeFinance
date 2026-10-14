import { content } from "@/content/es";
import type { SelectOption } from "@/lib/ui/select-option";
import type { CategoryRow, PaymentMethodRow } from "@/types/database";

/**
 * Option lists for the transaction forms.
 *
 * Archived categories and deactivated payment methods are left out: they still
 * explain old rows, but nothing new should be filed against them.
 */
export function categoryOptions(categories: readonly CategoryRow[]): SelectOption[] {
  return categories
    .filter((category) => !category.archived)
    .map((category) => ({ value: category.id, label: category.name }));
}

/**
 * A payment method option that also says whether it is a credit card.
 *
 * The expense form only offers cuotas and a %EA once a card is chosen, so the
 * choice has to carry that with it rather than the form looking it up again.
 */
export interface PaymentMethodChoice extends SelectOption {
  isCreditCard: boolean;
  /** The card's own %EA, offered as the starting point for a purchase. */
  defaultRatePercent: number | null;
}

/** Payment methods, labelled with their owner so two "Bancolombia" rows differ. */
export function paymentMethodOptions(
  paymentMethods: readonly PaymentMethodRow[],
  memberNames: ReadonlyMap<string, string>,
): PaymentMethodChoice[] {
  return paymentMethods
    .filter((method) => method.active)
    .map((method) => {
      const owner = memberNames.get(method.user_id);
      return {
        value: method.id,
        label: owner === undefined ? method.name : `${method.name} · ${owner}`,
        isCreditCard: method.type === "credit_card",
        defaultRatePercent: method.default_annual_rate_percent,
      };
    });
}

export function memberOptions(
  members: readonly { userId: string; displayName: string }[],
): SelectOption[] {
  return members.map((member) => ({ value: member.userId, label: member.displayName }));
}

export function paymentMethodTypeOptions(): SelectOption[] {
  return [
    { value: "bank_account", label: content.paymentMethodType.bank_account },
    { value: "benefits_card", label: content.paymentMethodType.benefits_card },
    { value: "credit_card", label: content.paymentMethodType.credit_card },
    { value: "cash", label: content.paymentMethodType.cash },
  ];
}
