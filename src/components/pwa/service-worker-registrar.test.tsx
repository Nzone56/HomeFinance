import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerRegistrar } from "./service-worker-registrar";

const register = vi.fn(async () => ({}) as ServiceWorkerRegistration);
const unregister = vi.fn(async () => true);
const getRegistrations = vi.fn(async () => [{ unregister } as unknown as ServiceWorkerRegistration]);
const deleteCache = vi.fn(async (_key: string) => true);

function giveBrowserAServiceWorker() {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register, getRegistrations },
  });
  vi.stubGlobal("caches", {
    keys: async () => ["home-finance-assets-v1"],
    delete: deleteCache,
  });
}

function takeServiceWorkerAway() {
  Reflect.deleteProperty(navigator, "serviceWorker");
}

beforeEach(() => {
  register.mockClear();
  register.mockResolvedValue({} as ServiceWorkerRegistration);
  unregister.mockClear();
  getRegistrations.mockClear();
  deleteCache.mockClear();
  giveBrowserAServiceWorker();
  vi.stubEnv("NODE_ENV", "production");
});

afterEach(() => {
  // vi.unstubAllEnvs restores NODE_ENV on its own.
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  takeServiceWorkerAway();
});

describe("ServiceWorkerRegistrar", () => {
  it("registers the worker that makes the app installable", () => {
    render(<ServiceWorkerRegistrar />);

    expect(register).toHaveBeenCalledWith("/sw.js");
    expect(getRegistrations).not.toHaveBeenCalled();
  });

  it("clears a worker a production run left behind, so development never serves stale code (regression)", async () => {
    // A `next start` on localhost left its worker installed, and `next dev` on the
    // same origin then got cached chunks: edits only showed after a refresh.
    vi.stubEnv("NODE_ENV", "development");

    render(<ServiceWorkerRegistrar />);

    expect(register).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(unregister).toHaveBeenCalled());
    await vi.waitFor(() => expect(deleteCache).toHaveBeenCalledWith("home-finance-assets-v1"));
  });

  it("leaves development as it was when the cleanup fails", async () => {
    vi.stubEnv("NODE_ENV", "development");
    getRegistrations.mockRejectedValueOnce(new Error("no"));

    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
    await vi.waitFor(() => expect(getRegistrations).toHaveBeenCalled());
    expect(deleteCache).not.toHaveBeenCalled();
  });

  it("does nothing in a browser without service workers", () => {
    takeServiceWorkerAway();

    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
    expect(register).not.toHaveBeenCalled();
  });

  it("survives a registration that fails — installability is not correctness", async () => {
    register.mockRejectedValue(new Error("no"));

    expect(() => render(<ServiceWorkerRegistrar />)).not.toThrow();
    await vi.waitFor(() => expect(register).toHaveBeenCalled());
  });

  it("renders nothing of its own", () => {
    const { container } = render(<ServiceWorkerRegistrar />);

    expect(container).toBeEmptyDOMElement();
  });
});
