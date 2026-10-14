import { formatCop, formatCopCompact, formatSignedCop } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

interface AmountProps {
  value: number;
  /** Shorten large figures, for headline numbers. */
  compact?: boolean;
  /** Show an explicit `+` on positives, where direction is the point. */
  signed?: boolean;
  /**
   * `auto` colours a positive figure as good; `auto-inverse` does the opposite,
   * for figures like overspending where more is worse. `muted` plays it down.
   */
  tone?: "default" | "auto" | "auto-inverse" | "muted";
  className?: string;
}

const GOOD = "text-emerald-600 dark:text-emerald-400";
const BAD = "text-destructive";

function toneClass(tone: AmountProps["tone"], value: number): string {
  if (tone === "muted") {
    return "text-muted-foreground";
  }
  if (tone !== "auto" && tone !== "auto-inverse") {
    return "";
  }
  if (value === 0) {
    return "text-muted-foreground";
  }

  const isGood = tone === "auto" ? value > 0 : value < 0;
  return isGood ? GOOD : BAD;
}

function format(value: number, compact: boolean, signed: boolean): string {
  if (!compact) {
    return signed ? formatSignedCop(value) : formatCop(value);
  }
  // Compact still has to carry the sign: on a variance figure, the direction is
  // the whole point.
  const shortened = formatCopCompact(value);
  return signed && value > 0 ? `+${shortened}` : shortened;
}

/**
 * A money figure. Always tabular so columns of amounts line up on their digits
 * rather than drifting with the glyph widths.
 */
export function Amount({
  value,
  compact = false,
  signed = false,
  tone = "default",
  className,
}: AmountProps) {
  return (
    <span className={cn("font-medium tabular-nums", toneClass(tone, value), className)}>
      {format(value, compact, signed)}
    </span>
  );
}
