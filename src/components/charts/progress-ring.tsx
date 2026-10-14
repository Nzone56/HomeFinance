import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ProgressRingProps {
  /** 0–100, and beyond: past 100 the ring is full and the caller says by how much. */
  value: number;
  label: string;
  /** Status colour for a limit, series colour for identity. */
  fill: string;
  /**
   * A second position on the same ring, drawn as a tick rather than an arc —
   * a reference line, not a series. Used for how far through the month we are.
   */
  marker?: { value: number; label: string };
  /** The figure itself, printed in the middle. */
  children: ReactNode;
  className?: string;
}

/** Geometry, in the ring's own viewBox units. */
const SIZE = 120;
const CENTER = SIZE / 2;
const STROKE = 11;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const clamp = (value: number) => Math.min(Math.max(value, 0), 100);

/** Where a percentage sits on the ring, in SVG coordinates. Twelve o'clock is 0. */
function pointAt(percentage: number, distanceFromCenter: number) {
  const angle = (clamp(percentage) / 100) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + distanceFromCenter * Math.cos(angle),
    y: CENTER + distanceFromCenter * Math.sin(angle),
  };
}

/**
 * One ratio against its limit, as a ring.
 *
 * A ring rather than a pie: the hole is where the figure goes, so the number
 * and the shape saying the same thing sit together instead of competing. Like
 * `Meter`, this is one measure against one limit — there is no second scale.
 *
 * The arc stops at full. Spending 140% of the plan cannot draw a longer circle,
 * so the overshoot is the caller's to say in words, and the ring turns to the
 * critical colour to make sure it is not missed.
 */
export function ProgressRing({
  value,
  label,
  fill,
  marker,
  children,
  className,
}: ProgressRingProps) {
  const filled = (clamp(value) / 100) * CIRCUMFERENCE;
  // One object rather than two points, so the tick is a single decision the
  // renderer can narrow on.
  const tick =
    marker === undefined
      ? null
      : {
          label: marker.label,
          inner: pointAt(marker.value, RADIUS - STROKE / 2 - 1),
          outer: pointAt(marker.value, RADIUS + STROKE / 2 + 1),
        };

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

        {filled > 0 ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={fill}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
            // Start at twelve o'clock; the arc grows clockwise from there.
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
          />
        ) : null}

        {tick === null ? null : (
          <line
            x1={tick.inner.x}
            y1={tick.inner.y}
            x2={tick.outer.x}
            y2={tick.outer.y}
            strokeWidth={2}
            strokeLinecap="round"
            className="stroke-foreground"
          >
            <title>{tick.label}</title>
          </line>
        )}
      </svg>

      <div className="absolute inset-0 grid place-items-center px-4 text-center">{children}</div>
    </div>
  );
}
