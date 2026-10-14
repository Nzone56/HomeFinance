"use client";

import type { ReactNode } from "react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { content } from "@/content/es";

interface MovementsTabsProps {
  expenses: ReactNode;
  transfers: ReactNode;
}

/**
 * Spending and money-moving live side by side but must never be confused, so
 * they get separate tabs rather than one merged list.
 *
 * Both panels are rendered on the server and handed in as children; this only
 * owns which one is visible.
 */
export function MovementsTabs({ expenses, transfers }: MovementsTabsProps) {
  return (
    <Tabs defaultValue="expenses" className="gap-4">
      <TabsList>
        <TabsTrigger value="expenses">{content.expenses.tabExpenses}</TabsTrigger>
        <TabsTrigger value="transfers">{content.expenses.tabTransfers}</TabsTrigger>
      </TabsList>

      <TabsContent value="expenses" className="grid gap-4">
        {expenses}
      </TabsContent>

      <TabsContent value="transfers" className="grid gap-4">
        {transfers}
      </TabsContent>
    </Tabs>
  );
}
