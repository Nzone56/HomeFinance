"use client";

import { Pencil, Plus } from "lucide-react";

import { ActionSheet } from "@/components/form/action-sheet";
import { TextField } from "@/components/form/field";
import { SwitchField } from "@/components/form/switch-field";
import { Button } from "@/components/ui/button";
import { content } from "@/content/es";
import { saveCategory } from "@/features/settings/actions";
import type { CategoryRow } from "@/types/database";

interface CategorySheetProps {
  category?: CategoryRow;
  /** Where a newly created category lands in the list. */
  nextSortOrder: number;
}

/**
 * Categories are archived rather than deleted: expenses reference them, and a
 * past month must keep explaining itself.
 */
export function CategorySheet({ category, nextSortOrder }: CategorySheetProps) {
  const isEditing = category !== undefined;

  return (
    <ActionSheet
      action={saveCategory}
      title={isEditing ? category.name : content.settings.newCategory}
      trigger={
        isEditing ? (
          <Button type="button" variant="ghost" size="icon" aria-label={content.common.edit}>
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button type="button" size="sm">
            <Plus className="size-4" aria-hidden="true" />
            {content.common.add}
          </Button>
        )
      }
    >
      {(fields) => (
        <>
          {isEditing ? <input type="hidden" name="id" value={category.id} /> : null}
          <input
            type="hidden"
            name="sort_order"
            value={String(category?.sort_order ?? nextSortOrder)}
          />

          <TextField
            label={content.settings.categoryName}
            autoComplete="off"
            required
            {...fields("name", category?.name)}
          />

          <SwitchField
            label={content.settings.categoryArchived}
            name="archived"
            defaultChecked={fields.isChecked("archived", category?.archived ?? false)}
          />
        </>
      )}
    </ActionSheet>
  );
}
