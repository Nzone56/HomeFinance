import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import type * as Navigation from "next/navigation";
import { afterEach, vi } from "vitest";

import { installMatchMedia, setDesktop } from "./media";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  setDesktop(false);
});

// jsdom ships neither of these, and Radix-based components reach for both.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

/*
 * jsdom implements no pointer-capture API and no scrollIntoView, which Radix's
 * select and dropdown call while opening. Without these they never open in
 * tests even though they work perfectly in a browser.
 */
Element.prototype.hasPointerCapture = () => false;
Element.prototype.setPointerCapture = () => {};
Element.prototype.releasePointerCapture = () => {};
Element.prototype.scrollIntoView = () => {};

// jsdom declares requestSubmit but throws "not implemented". Components that
// submit a form programmatically rely on it, so give it real behaviour.
HTMLFormElement.prototype.requestSubmit = function requestSubmit(this: HTMLFormElement) {
  this.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
};

// The app router is not mounted in tests, and every form reloads the page's data
// after a save (see `ActionFeedback`). A file that mocks `next/navigation`
// itself replaces this.
vi.mock("next/navigation", async (importOriginal) => {
  const router = {
    refresh: vi.fn(),
    replace: vi.fn(),
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  };
  return {
    ...(await importOriginal<typeof Navigation>()),
    useRouter: () => router,
  };
});

// jsdom has no matchMedia at all. Every test starts on the narrow side of the
// breakpoint; one that wants the desktop shape says so with `setDesktop`.
installMatchMedia();
