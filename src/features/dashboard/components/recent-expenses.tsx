import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Amount } from "@/components/money/amount";
import { MemberAvatar } from "@/components/people/member-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import { labelFor, type TransactionLabels } from "@/features/transactions/lib/labels";
import { formatDayLabel } from "@/lib/format/date";
import { ROUTES } from "@/lib/routes";
import { OTHER_CATEGORY_COLOR } from "@/lib/ui/category-colors";
import { memberColor } from "@/lib/ui/member-colors";
import type { ExpenseRow } from "@/types/database";

const RECENT_LIMIT = 6;

interface RecentExpensesProps {
  /** Already filtered to the selected month and sorted newest first. */
  expenses: readonly ExpenseRow[];
  labels: TransactionLabels;
  /** Shared with the donut, so a category is one colour across the page. */
  categoryColors: ReadonlyMap<string, string>;
}

/**
 * The last few movements, as a table.
 *
 * A table because every row answers the same five questions in the same order,
 * and a column you can run your eye down beats a paragraph per row. The
 * category keeps its own colour slot from the donut above, so the same category
 * is the same colour wherever it appears on the page.
 */
export function RecentExpenses({ expenses, labels, categoryColors }: RecentExpensesProps) {
  const recent = expenses.slice(0, RECENT_LIMIT);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">{content.dashboard.recent}</CardTitle>
        <Link
          href={ROUTES.expenses}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          {content.dashboard.seeAll}
          <ArrowRight className="size-3" aria-hidden="true" />
        </Link>
      </CardHeader>

      <CardContent>
        {recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">{content.dashboard.recentEmpty}</p>
        ) : (
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted-foreground border-b text-left text-xs">
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {content.expenses.date}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {content.expenses.description}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {content.expenses.category}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {content.expenses.paymentMethod}
                  </th>
                  <th scope="col" className="py-2 pr-3 font-normal">
                    {content.expenses.paidBy}
                  </th>
                  <th scope="col" className="py-2 text-right font-normal">
                    {content.expenses.amount}
                  </th>
                </tr>
              </thead>

              <tbody className="appear-children divide-y">
                {recent.map((expense) => (
                  <tr key={expense.id}>
                    <td className="text-muted-foreground py-2.5 pr-3 whitespace-nowrap">
                      {formatDayLabel(expense.occurred_on)}
                    </td>
                    <td className="max-w-40 py-2.5 pr-3">
                      <span className="flex items-center gap-2">
                        <span className="truncate font-medium">{expense.description}</span>
                        {expense.shared ? null : (
                          <Badge variant="outline" className="shrink-0 font-normal">
                            {content.expenses.personal}
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <span
                          aria-hidden="true"
                          className="size-2.5 shrink-0 rounded-full"
                          // A category outside the donut's top slices wears
                          // chrome rather than borrowing another's slot —
                          // which is exactly what "Otros" means there too.
                          style={{
                            backgroundColor: labelFor(
                              categoryColors,
                              expense.category_id,
                              OTHER_CATEGORY_COLOR,
                            ),
                          }}
                        />
                        {labelFor(labels.categories, expense.category_id, "—")}
                      </span>
                    </td>
                    <td className="text-muted-foreground py-2.5 pr-3 whitespace-nowrap">
                      {labelFor(labels.methods, expense.payment_method_id, "—")}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2 whitespace-nowrap">
                        <MemberAvatar
                          name={labelFor(labels.members, expense.user_id, "—")}
                          color={memberColor(labels.memberColors, expense.user_id)}
                        />
                        <span className="text-muted-foreground">
                          {labelFor(labels.members, expense.user_id, "—")}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <Amount value={expense.amount} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
