/**
 * The one or two letters an avatar shows for a person.
 *
 * Two words give two letters ("Julián Pereira" → "JP"); anything else gives
 * one. A member with no name yet still gets a readable mark rather than an
 * empty circle.
 */
export function initials(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
    .slice(0, 2)
    .map((word) => word.slice(0, 1).toUpperCase())
    .join("");

  return letters === "" ? "?" : letters;
}
