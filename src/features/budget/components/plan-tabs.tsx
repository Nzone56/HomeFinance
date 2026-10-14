"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { content } from "@/content/es";

interface PlanTabsProps {
  template: ReactNode;
  month: ReactNode;
  monthLabel: string;
}

/**
 * Keeps the global template and a single month's adjustments visibly separate,
 * so it is always obvious which one an edit will change.
 */
export function PlanTabs({ template, month, monthLabel }: PlanTabsProps) {
  return (
    <Tabs defaultValue="month" className="gap-4">
      <TabsList>
        <TabsTrigger value="month">{monthLabel}</TabsTrigger>
        <TabsTrigger value="template">{content.budget.templateTab}</TabsTrigger>
      </TabsList>

      <TabsContent value="month">{month}</TabsContent>
      <TabsContent value="template">{template}</TabsContent>
    </Tabs>
  );
}
