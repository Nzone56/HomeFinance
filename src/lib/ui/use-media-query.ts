"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Whether a CSS media query currently matches.
 *
 * `useSyncExternalStore` rather than an effect: the server snapshot is `false`,
 * so the first client render agrees with the server and only re-renders once
 * the real answer is known. Anything rendered behind this must therefore be
 * absent — not merely different — on the server, which is true of a dialog that
 * mounts nothing until it is opened.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `md` breakpoint — where a drawer stops being the right shape. */
export const DESKTOP_QUERY = "(min-width: 48rem)";
