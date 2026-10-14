import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DonutSlice {
  key: string;
  label: string;
  /** Share of the whole, 0–100. */
  percentage: number;
  color: string;
}

interface DonutChartProps {
  slices: readonly DonutSlice[];
  label: string;
  /** The total, printed in the hole. */
  children: ReactNode;
  className?: string;
}

const SIZE = 120;
const CENTER = SIZE / 2;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * A 2px gap of surface between touching segments — never a border, which would
 * add ink that is not data.
 */
const GAP = 2;

/**
 * Part-to-whole, as a ring.
 *
 * The hole is where the total goes, so the shape and the figure it sums to sit
 * together. Every slice is named and valued in the legend the caller renders
 * beside it: the colours label the parts rather than carrying the meaning on
 * their own.
 */
export function DonutChart({ slices, label, children, className }: DonutChartProps) {
  // Each arc starts where the one before it ended, so the offsets are worked
  // out up front rather than accumulated while rendering.
  const arcs = slices.reduce<{ slice: DonutSlice; length: number; offset: number }[]>(
    (drawn, slice) => {
      const previous = drawn.at(-1);
      const offset = previous === undefined ? 0 : previous.offset + previous.length;
      return [...drawn, { slice, length: (slice.percentage / 100) * CIRCUMFERENCE, offset }];
    },
    [],
  );

  return (
    <div className={cn("relative isolate shrink-0", className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" role="img" aria-label={label}>
        <circle
          cx={CENTER}
          cy={CENTER}
          r={RADIUS}
          fill="none"
          strokeWidth={STROKE}
          className="stroke-muted"
        />

        {arcs.map(({ slice, length, offset }) => {
          // A slice thinner than the gap would render as a sliver of the gap
          // itself, so it keeps a hairline of its own colour instead.
          const drawn = Math.max(length - GAP, 0.5);

          return (
            <circle
              key={slice.key}
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke={slice.color}
              strokeWidth={STROKE}
              strokeDasharray={`${drawn} ${CIRCUMFERENCE - drawn}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
            >
              <title>{slice.label}</title>
            </circle>
          );
        })}
      </svg>

      <div className="absolute inset-0 grid place-items-center px-6 text-center">{children}</div>
    </div>
  );
}
