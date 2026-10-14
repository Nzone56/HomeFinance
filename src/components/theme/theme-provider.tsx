"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * React 19 warns about any `<script>` it renders on the client, because such a
 * script would never run. next-themes' script only ever needs to run from the
 * server HTML, so on the client it is re-typed as inert JSON. React does not
 * patch attributes during hydration, so the script the browser already ran
 * stays as parsed; `suppressHydrationWarning` silences the mismatch.
 */
export const THEME_SCRIPT_PROPS =
  typeof window === "undefined"
    ? undefined
    : { type: "application/json", suppressHydrationWarning: true };

/**
 * Light and dark themes.
 *
 * `next-themes` writes the stored choice onto `<html>` with an inline script
 * that runs while the browser is still parsing the document, so the correct
 * theme is in place before the first paint — no flash of the wrong one. That is
 * why the root layout carries `suppressHydrationWarning`: the DOM is
 * deliberately ahead of React by the time hydration runs.
 *
 * `class` is the attribute the Tailwind tokens key off (`.dark` in globals.css).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={THEME_SCRIPT_PROPS}
    >
      {children}
    </NextThemesProvider>
  );
}
