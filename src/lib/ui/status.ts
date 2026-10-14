/**
 * How a figure is doing against its limit.
 *
 * Status colours are reserved for state and never reused as a series colour, so
 * a red bar always means "over", never "category 4". Every caller pairs the
 * colour with a label or a figure — colour is never the only signal.
 */
export type SpendStatus = "good" | "warning" | "critical";

/** Under 85% is comfortable, up to 100% is close, past it is over. */
export function spendStatus(percentage: number): SpendStatus {
  if (percentage >= 100) {
    return "critical";
  }
  if (percentage >= 85) {
    return "warning";
  }
  return "good";
}

const STATUS_FILL: Record<SpendStatus, string> = {
  good: "var(--status-good)",
  warning: "var(--status-warning)",
  critical: "var(--status-critical)",
};

export function statusFill(status: SpendStatus): string {
  return STATUS_FILL[status];
}
