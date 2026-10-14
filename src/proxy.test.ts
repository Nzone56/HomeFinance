import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

import { updateSession } from "@/lib/supabase/session";

import { config, proxy } from "./proxy";

vi.mock("@/lib/supabase/session", () => ({
  updateSession: vi.fn(async () => NextResponse.next()),
}));

describe("proxy", () => {
  it("hands every matched request to the session refresher", async () => {
    const request = new NextRequest("https://finanzas.test/dashboard");

    await proxy(request);

    expect(updateSession).toHaveBeenCalledWith(request);
  });
});

describe("config.matcher", () => {
  // Next matches the pattern against the whole pathname, so anchor it here too.
  const matcher = new RegExp(`^${config.matcher[0] ?? ""}$`);

  it("covers the application routes", () => {
    for (const path of ["/", "/dashboard", "/expenses", "/income", "/budget", "/settings"]) {
      expect(matcher.test(path)).toBe(true);
    }
  });

  it("leaves the PWA files reachable while signed out", () => {
    // Without these the app cannot install or show its icon on the login screen.
    for (const path of [
      "/manifest.webmanifest",
      "/sw.js",
      "/icons/icon-192.png",
      "/favicon.ico",
      "/_next/static/chunk.js",
    ]) {
      expect(matcher.test(path)).toBe(false);
    }
  });
});
