import { cn } from "@/lib/utils";

interface MeterProps {
  /** 0-100. Values past 100 fill the track and are shown by the caller's label. */
  value: number;
  label: string;
  /** The fill colour — a status colour for limits, a series colour for identity. */
  fill: string;
  className?: string;
}

/**
 * A single ratio against a limit.
 *
 * A meter rather than a two-slice pie, and a plain track rather than a chart:
 * one number against one limit does not need axes. The rounded data-end sits at
 * the filled edge and stays square against the baseline.
 */
export function Meter({ value, label, fill, className }: MeterProps) {
  const width = Math.min(Math.max(value, 0), 100);

  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className="h-full rounded-full transition-[width]"
        style={{ width: `${width}%`, backgroundColor: fill }}
      />
    </div>
  );
}
