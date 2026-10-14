/**
 * Categorical series colours, in fixed slot order.
 *
 * The order is the colour-blind-safety mechanism, not decoration: these slots
 * were validated as a set against both the light and the dark card surface.
 * A series keeps its slot however many are on screen, so filtering one out
 * never repaints the ones that remain.
 */
const SERIES_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

/** Used when an index falls outside the palette — never a generated hue. */
const FALLBACK_COLOR = "var(--chart-1)";

/**
 * The colour for a series at a given position, cycling through the slots.
 *
 * Past the palette the answer is the first slot rather than a new hue: a
 * generated colour is indistinguishable from an existing one under colour
 * blindness and would break the validated set.
 */
export function seriesColor(index: number): string {
  return SERIES_COLORS[index % SERIES_COLORS.length] ?? FALLBACK_COLOR;
}
