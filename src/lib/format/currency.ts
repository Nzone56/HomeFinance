/**
 * Locale-aware presentation of COP amounts.
 *
 * Colombian pesos are not divided into cents in everyday use, so every
 * formatter here drops the fraction entirely.
 */

const COP_FORMATTER = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

/**
 * Compact units, largest first.
 *
 * Built by hand rather than with `Intl`'s `notation: "compact"`, which is not
 * portable: Node's ICU renders `$160 K` where Chrome renders `$160 k`. That
 * difference showed the same figure two ways on one screen and broke hydration,
 * because the server and the browser disagreed on the text.
 */
const COMPACT_UNITS = [
  { threshold: 1_000_000_000, suffix: " MM" },
  { threshold: 1_000_000, suffix: " M" },
  { threshold: 1_000, suffix: " K" },
] as const;

function decimalFormatter(maximumFractionDigits: number): Intl.NumberFormat {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits });
}

/**
 * Intl separates the currency symbol with a non-breaking space, which is right
 * for rendering but surprising in comparisons and snapshots. Normalising to a
 * plain space keeps the output predictable.
 */
function normalise(value: string): string {
  return value.replace(/ /g, " ");
}

/** `$ 80.000` */
export function formatCop(amount: number): string {
  return normalise(COP_FORMATTER.format(amount));
}

/**
 * `$7,4 M` — for headline figures where the exact peso adds nothing.
 *
 * Anything under a thousand is shown in full: shortening it would gain nothing
 * and lose precision.
 */
export function formatCopCompact(amount: number): string {
  const magnitude = Math.abs(amount);
  const unit = COMPACT_UNITS.find((candidate) => magnitude >= candidate.threshold);

  if (unit === undefined) {
    return formatCop(amount);
  }

  const scaled = magnitude / unit.threshold;
  // One decimal while the figure is small enough for it to mean something.
  const formatted = decimalFormatter(scaled < 10 ? 1 : 0).format(scaled);

  return `${amount < 0 ? "-" : ""}$${normalise(formatted)}${unit.suffix}`;
}

/** `+$ 500.000` / `-$ 500.000`, for variances where direction is the point. */
export function formatSignedCop(amount: number): string {
  if (amount > 0) {
    return `+${formatCop(amount)}`;
  }
  return formatCop(amount);
}

/**
 * Reads an amount the way a person types it: `1.500.000`, `$1.500.000` or
 * `1500000` all mean the same thing.
 *
 * Every non-digit is dropped, which is safe precisely because COP has no
 * cents — there is no decimal separator to preserve. Returns `null` when the
 * text holds no digits at all, so callers can tell "empty" from "zero".
 */
export function parseAmountInput(raw: string): number | null {
  // A minus sign is rejected rather than stripped. Every amount in this app is
  // a magnitude, and silently turning "-5000" into 5000 would be a data change
  // the user never asked for.
  if (raw.includes("-")) {
    return null;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits === "") {
    return null;
  }
  const value = Number(digits);
  return Number.isSafeInteger(value) ? value : null;
}
