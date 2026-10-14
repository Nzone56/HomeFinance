"use client";

import { ActionForm } from "@/components/form/action-form";
import { TextField } from "@/components/form/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import { saveHousehold, saveProfile } from "@/features/settings/actions";

interface GeneralSettingsProps {
  displayName: string;
  householdName: string;
}

/**
 * Who you are and what the house is called.
 *
 * Each block is its own form so saving your name cannot fail because of an
 * unrelated field elsewhere on the page. How a shared expense divides is set on
 * the expense itself, not here.
 */
export function GeneralSettings({ displayName, householdName }: GeneralSettingsProps) {
  return (
    <div className="appear-children grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{content.settings.profile}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={saveProfile}>
            {(fields) => (
              <TextField
                label={content.settings.displayName}
                required
                {...fields("display_name", displayName)}
              />
            )}
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{content.settings.household}</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={saveHousehold}>
            {(fields) => (
              <TextField
                label={content.settings.householdName}
                required
                {...fields("name", householdName)}
              />
            )}
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}
