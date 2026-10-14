import { barGeometry, buildBarScale } from "@/lib/calculations/bars";
import { formatCopCompact } from "@/lib/format/currency";
import { cn } from "@/lib/utils";

export interface BarSeries {
  key: string;
  label: string;
  color: string;
}

export interface Bar {
  /** Which series this bar belongs to — its key and colour come with it. */
  series: BarSeries;
  value: number;
}

export interface BarGroup {
  key: string;
  label: string;
  bars: readonly Bar[];
}

interface GroupedBarsProps {
  /** For the legend. Every group carries its own colours, so nothing is looked up. */
  series: readonly BarSeries[];
  groups: readonly BarGroup[];
  /** Names the chart for a screen reader and captions the table view. */
  label: string;
  className?: string;
}

/**
 * Two measures per group, on one scale.
 *
 * Built in HTML rather than SVG on purpose: an SVG `<text>` scales with its
 * viewBox and balloons on a wide card, whereas these labels have to stay at
 * reading size whatever the column does.
 *
 * One y-scale, always — everything compared here is money, so it can share one.
 * Two measures of different kinds would be two charts.
 */
export function GroupedBars({ series, groups, label, className }: GroupedBarsProps) {
  const scale = buildBarScale(groups.flatMap((group) => group.bars.map((bar) => bar.value)));

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {series.map((entry) => (
          <span key={entry.key} className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {entry.label}
          </span>
        ))}
      </div>

      <div className="grid gap-2" role="img" aria-label={label}>
        <div className="relative flex h-44 items-stretch gap-2 pt-5">
          {/* The zero line is drawn, not implied: a bar below it is a real
              negative rather than just a short one. */}
          <div
            aria-hidden="true"
            className="bg-chart-axis absolute inset-x-0 h-px"
            style={{ bottom: `${scale.zeroLine}%` }}
          />

          {groups.map((group) => (
            <div key={group.key} className="relative flex flex-1 justify-center gap-4">
              {group.bars.map((bar) => {
                const { base, height } = barGeometry(bar.value, scale);

                return (
                  <div key={bar.series.key} className="relative w-6">
                    <div
                      className="absolute inset-x-0 rounded-sm"
                      style={{
                        bottom: `${base}%`,
                        height: `${height}%`,
                        backgroundColor: bar.series.color,
                      }}
                    >
                      <span className="sr-only">
                        {group.label} · {bar.series.label}
                      </span>
                    </div>
                    <span
                      aria-hidden="true"
                      className="text-muted-foreground absolute inset-x-0 -mx-3 text-center text-xs tabular-nums"
                      style={{ bottom: `calc(${base + height}% + 0.25rem)` }}
                    >
                      {formatCopCompact(bar.value)}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          {groups.map((group) => (
            <span key={group.key} className="flex-1 text-center text-xs font-medium">
              {group.label}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{label}</th>
            {series.map((entry) => (
              <th key={entry.key} scope="col">
                {entry.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <tr key={group.key}>
              <th scope="row">{group.label}</th>
              {group.bars.map((bar) => (
                <td key={bar.series.key}>{formatCopCompact(bar.value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
