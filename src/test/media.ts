/**
 * A stand-in for the viewport.
 *
 * jsdom does no layout, so `window.matchMedia` always answers "no" and every
 * responsive component would only ever be tested in its narrow shape. This lets
 * a test say which side of the breakpoint it is on, and — because the listeners
 * are real — lets it move the breakpoint mid-test.
 */
let isDesktop = false;
const listeners = new Set<() => void>();

export function setDesktop(value: boolean): void {
  isDesktop = value;
  for (const listener of listeners) {
    listener();
  }
}

export function installMatchMedia(): void {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      get matches() {
        return isDesktop;
      },
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener(_type: string, listener: () => void) {
        listeners.add(listener);
      },
      removeEventListener(_type: string, listener: () => void) {
        listeners.delete(listener);
      },
      dispatchEvent: () => false,
    }),
  });
}

/** How many subscriptions are still open — a leak shows up here. */
export function activeListeners(): number {
  return listeners.size;
}
