/** Where a bar starts and how tall it is, both as a percentage of the plot. */
export interface BarGeometry {
  /** Distance from the bottom of the plot to the bar's lower edge. */
  base: number;
  height: number;
}

export interface BarScale {
  /** Where zero sits, as a percentage up from the bottom of the plot. */
  zeroLine: number;
  /** The value range the plot covers, from the lowest bar to the highest. */
  span: number;
}

/**
 * One scale for every bar in a chart.
 *
 * Zero is always inside the range, so a bar's length stays proportional to its
 * value — a plot that started at the smallest value would make a small
 * difference look like a large one. "Disponible" goes negative in a month that
 * spent more than it earned, which is exactly when the baseline has to be real.
 */
export function buildBarScale(values: readonly number[]): BarScale {
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = max - min;

  if (span === 0) {
    return { zeroLine: 0, span: 0 };
  }
  // `Math.abs` rather than negating: `-0 / span` is negative zero, which is
  // true to the maths and a nuisance everywhere else.
  return { zeroLine: (Math.abs(min) / span) * 100, span };
}

/** Where one value's bar sits on that scale. */
export function barGeometry(value: number, scale: BarScale): BarGeometry {
  if (scale.span === 0) {
    return { base: scale.zeroLine, height: 0 };
  }

  const height = (Math.abs(value) / scale.span) * 100;
  return { base: value < 0 ? scale.zeroLine - height : scale.zeroLine, height };
}
