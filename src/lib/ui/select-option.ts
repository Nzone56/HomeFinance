/** One choice in a select. Kept outside the client component so server modules
 * can build option lists without importing a client boundary. */
export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Stands in for "nothing selected" in an optional select.
 *
 * Radix refuses an empty string as an item value, so optional selects post this
 * sentinel and the schema turns it back into `null`.
 */
export const NO_SELECTION = "none";
