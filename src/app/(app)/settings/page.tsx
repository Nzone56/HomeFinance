import type { Metadata } from "next";

import { content } from "@/content/es";
import { GeneralSettings } from "@/features/settings/components/general-settings";
import { ReferenceData } from "@/features/settings/components/reference-data";
import { buildTransactionLabels } from "@/features/transactions/lib/labels";
import { memberOptions } from "@/features/transactions/lib/options";
import { loadSettingsData } from "@/lib/data/finance";
import { requireHouseholdContext } from "@/lib/data/household";
import { currentMonthKey } from "@/lib/dates/month";

export const metadata: Metadata = { title: content.settings.title };

export default async function SettingsPage() {
  // Fetched together: RLS scopes the data, so it need not wait for the household.
  const [{ household, members, userId }, data] = await Promise.all([
    requireHouseholdContext(),
    loadSettingsData(),
  ]);

  const labels = buildTransactionLabels({ members });
  const me = members.find((member) => member.userId === userId);

  return (
    <div className="appear-children grid gap-6">
      <h1 className="text-xl font-semibold">{content.settings.title}</h1>

      <GeneralSettings displayName={me?.displayName ?? ""} householdName={household.name} />

      <ReferenceData
        paymentMethods={data.paymentMethods}
        categories={data.categories}
        incomeSources={data.incomeTemplate}
        incomeAmounts={data.incomeTemplateAmounts}
        currentMonth={currentMonthKey(new Date())}
        memberOptions={memberOptions(members)}
        memberNames={labels.members}
        currentUserId={userId}
      />
    </div>
  );
}
