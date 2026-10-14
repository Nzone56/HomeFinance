"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { content } from "@/content/es";
import { trendPeak, type TrendPoint } from "@/lib/calculations/trend";
import { formatCop, formatCopCompact } from "@/lib/format/currency";
import { formatMonthLabel, formatMonthLabelShort } from "@/lib/format/date";
import { cn } from "@/lib/utils";

/**
 * Plot geometry in viewBox units. The marks span the full width so a point's
 * position is the same percentage in the SVG and in the HTML label row beneath
 * it — which is why the labels live in HTML: SVG text scales with the viewBox
 * and would balloon on a wide screen.
 */
const WIDTH = 480;
const HEIGHT = 140;
const TOP = 10;
const BOTTOM = 130;

interface Series {
  key: "income" | "expenses";
  label: string;
  /** Categorical slot. A series keeps its colour however many are shown. */
  color: string;
}

const SERIES: Series[] = [
  { key: "income", label: content.dashboard.income, color: "var(--chart-1)" },
  { key: "expenses", label: content.dashboard.expenses, color: "var(--chart-2)" },
];

/** Position of a point as a fraction of the plot width. */
function fractionFor(index: number, count: number): number {
  return count <= 1 ? 0.5 : index / (count - 1);
}

function xFor(index: number, count: number): number {
  return fractionFor(index, count) * WIDTH;
}

/** Only ever called once the empty state has ruled out a peak of zero. */
function yFor(value: number, peak: number): number {
  return BOTTOM - (value / peak) * (BOTTOM - TOP);
}

function SeriesKey({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      className="size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

/**
 * Income against expenses over recent months.
 *
 * One y-scale for both series — they are the same measure in the same currency,
 * so a second axis would invent a relationship the data does not contain.
 *
 * Colour is never the only channel: a legend is always present, the latest
 * value of each series is labelled directly, and the same figures are available
 * as a table to anyone who cannot see the plot.
 */
export function MonthlyTrendChart({ points }: { points: readonly TrendPoint[] }) {
  const [hovered, setHovered] = useState<{ index: number; point: TrendPoint } | null>(null);

  const peak = trendPeak(points);
  const latest = points.at(-1);

  // Order matters: an empty list is caught by `latest`, a list of zeroes by `peak`.
  if (latest === undefined || peak === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{content.dashboard.trend}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{content.dashboard.trendEmpty}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base">{content.dashboard.trend}</CardTitle>

        <ul className="flex items-center gap-3">
          {SERIES.map((series) => (
            <li
              key={series.key}
              className="text-muted-foreground flex items-center gap-1.5 text-xs"
            >
              <SeriesKey color={series.color} />
              {series.label}
              <span className="text-foreground font-medium">
                {formatCopCompact(latest[series.key])}
              </span>
            </li>
          ))}
        </ul>
      </CardHeader>

      <CardContent>
        <div className="relative">
          <svg
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            preserveAspectRatio="none"
            className="h-36 w-full"
            role="img"
            aria-label={content.dashboard.trend}
          >
            {/* Gridlines: hairline, solid, recessive. */}
            {[0, 0.5, 1].map((fraction) => (
              <line
                key={fraction}
                x1={0}
                x2={WIDTH}
                y1={yFor(peak * fraction, peak)}
                y2={yFor(peak * fraction, peak)}
                stroke="var(--chart-grid)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {hovered !== null ? (
              <line
                x1={xFor(hovered.index, points.length)}
                x2={xFor(hovered.index, points.length)}
                y1={TOP}
                y2={BOTTOM}
                stroke="var(--chart-axis)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ) : null}

            {SERIES.map((series) => (
              <path
                key={series.key}
                d={points
                  .map(
                    (point, index) =>
                      `${index === 0 ? "M" : "L"} ${xFor(index, points.length)} ${yFor(point[series.key], peak)}`,
                  )
                  .join(" ")}
                fill="none"
                stroke={series.color}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            {/* Hit bands: a full-height target per month, far easier to hit than
                the end markers. */}
            {points.map((point, index) => (
              <rect
                key={point.month}
                x={xFor(index, points.length) - WIDTH / (points.length * 2)}
                y={TOP}
                width={WIDTH / points.length}
                height={BOTTOM - TOP}
                fill="transparent"
                onMouseEnter={() => setHovered({ index, point })}
                onMouseLeave={() => setHovered(null)}
              />
            ))}
          </svg>

          {/* End markers sit in HTML so they stay perfectly round however wide
              the card gets — the SVG itself is stretched to fit. */}
          {SERIES.map((series) => (
            <span
              key={series.key}
              aria-hidden="true"
              className="border-card absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{
                backgroundColor: series.color,
                left: "100%",
                top: `${(yFor(latest[series.key], peak) / HEIGHT) * 100}%`,
              }}
            />
          ))}

          {hovered !== null ? (
            <div
              className="bg-popover text-popover-foreground pointer-events-none absolute top-0 rounded-md border px-2 py-1.5 text-xs shadow-md"
              style={fractionFor(hovered.index, points.length) > 0.5 ? { left: 0 } : { right: 0 }}
              role="status"
            >
              <p className="font-medium">{formatMonthLabel(hovered.point.month)}</p>
              {SERIES.map((series) => (
                <p key={series.key} className="flex items-center gap-1.5">
                  <SeriesKey color={series.color} />
                  {series.label}: {formatCop(hovered.point[series.key])}
                </p>
              ))}
            </div>
          ) : null}
        </div>

        {/* Month ticks in HTML, positioned to match their points exactly. */}
        <div className="text-muted-foreground relative mt-2 h-4 text-[11px]">
          {points.map((point, index) => (
            <span
              key={point.month}
              // The end labels anchor to the plot edges instead of centring on
              // their point, so neither gets clipped by the card.
              className={cn(
                "absolute whitespace-nowrap",
                index === 0 && "translate-x-0",
                index === points.length - 1 && "-translate-x-full",
                index > 0 && index < points.length - 1 && "-translate-x-1/2",
              )}
              style={{ left: `${fractionFor(index, points.length) * 100}%` }}
            >
              {formatMonthLabelShort(point.month)}
            </span>
          ))}
        </div>

        {/* The same figures, reachable without seeing the chart. */}
        <table className="sr-only">
          <caption>{content.dashboard.trend}</caption>
          <thead>
            <tr>
              <th scope="col">{content.dashboard.month}</th>
              {SERIES.map((series) => (
                <th key={series.key} scope="col">
                  {series.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.month}>
                <th scope="row">{formatMonthLabel(point.month)}</th>
                <td>{formatCop(point.income)}</td>
                <td>{formatCop(point.expenses)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
