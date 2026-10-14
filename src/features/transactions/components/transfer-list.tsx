import { ArrowRight } from "lucide-react";

import { ConfirmDeleteButton } from "@/components/form/confirm-delete-button";
import { Amount } from "@/components/money/amount";
import { MemberAvatar } from "@/components/people/member-avatar";
import { Card, CardContent } from "@/components/ui/card";
import { content } from "@/content/es";
import { deleteTransfer } from "@/features/transactions/actions";
import { labelFor, type TransactionLabels } from "@/features/transactions/lib/labels";
import { formatDayLabel } from "@/lib/format/date";
import { memberColor } from "@/lib/ui/member-colors";
import type { TransferRow } from "@/types/database";

interface TransferListProps {
  transfers: readonly TransferRow[];
  labels: TransactionLabels;
}

export function TransferList({ transfers, labels }: TransferListProps) {
  if (transfers.length === 0) {
    return (
      <Card>
        <CardContent className="grid gap-1 py-10 text-center">
          <p className="text-sm font-medium">{content.transfers.empty}</p>
          <p className="text-muted-foreground mx-auto max-w-md text-sm">{content.transfers.hint}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="appear-children divide-y">
          {transfers.map((transfer) => (
            <li key={transfer.id} className="flex items-center gap-3 px-4 py-3">
              <MemberAvatar
                name={labelFor(labels.members, transfer.user_id, "—")}
                color={memberColor(labels.memberColors, transfer.user_id)}
              />

              <div className="grid min-w-0 flex-1 gap-0.5">
                <span className="flex min-w-0 items-center gap-1.5 text-sm font-medium">
                  <span className="truncate">
                    {labelFor(labels.methods, transfer.from_payment_method_id, "—")}
                  </span>
                  <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">
                    {labelFor(labels.methods, transfer.to_payment_method_id, "—")}
                  </span>
                </span>
                <span className="text-muted-foreground truncate text-xs">
                  {labelFor(labels.members, transfer.user_id, "—")}
                </span>
              </div>

              <div className="grid justify-items-end gap-0.5 whitespace-nowrap">
                <Amount value={transfer.amount} className="text-sm" />
                <span className="text-muted-foreground text-xs">
                  {formatDayLabel(transfer.occurred_on)}
                </span>
              </div>

              <ConfirmDeleteButton
                action={deleteTransfer}
                id={transfer.id}
                label={content.a11y.deleteTransfer}
                confirmMessage={content.transfers.confirmDelete}
              />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
