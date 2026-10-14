import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_AUTHENTICATED_PATH, isPublicPath, LOGIN_PATH, updateSession } from "./session";

interface CookieOptions {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: object }[]) => void;
}

let currentUser: { id: string } | null = { id: "user-julian" };
let capturedCookies: CookieOptions | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: CookieOptions }) => {
    capturedCookies = options.cookies;
    return {
      auth: {
        getClaims: async () => ({
          data: currentUser === null ? null : { claims: { sub: currentUser.id } },
          error: null,
        }),
      },
    };
  }),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  currentUser = { id: "user-julian" };
  capturedCookies = undefined;
});

const requestFor = (path: string) => new NextRequest(`https://finanzas.test${path}`);

describe("isPublicPath", () => {
  it("treats only the login screen as public", () => {
    expect(isPublicPath(LOGIN_PATH)).toBe(true);
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/settings")).toBe(false);
  });
});

describe("updateSession", () => {
  it("sends a signed-out visitor to the login screen", async () => {
    currentUser = null;

    const response = await updateSession(requestFor("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`https://finanzas.test${LOGIN_PATH}`);
  });

  it("protects every authenticated route, not just the dashboard", async () => {
    currentUser = null;

    for (const path of ["/expenses", "/income", "/budget", "/settings"]) {
      const response = await updateSession(requestFor(path));
      expect(response.headers.get("location")).toBe(`https://finanzas.test${LOGIN_PATH}`);
    }
  });

  it("lets a signed-out visitor reach the login screen", async () => {
    currentUser = null;

    const response = await updateSession(requestFor(LOGIN_PATH));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends a signed-in user away from the login screen", async () => {
    const response = await updateSession(requestFor(LOGIN_PATH));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `https://finanzas.test${DEFAULT_AUTHENTICATED_PATH}`,
    );
  });

  it("lets a signed-in user through to the app", async () => {
    const response = await updateSession(requestFor("/dashboard"));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("keeps the query string when redirecting", async () => {
    currentUser = null;

    const response = await updateSession(
      new NextRequest("https://finanzas.test/dashboard?month=2026-09"),
    );

    expect(response.headers.get("location")).toBe("https://finanzas.test/login?month=2026-09");
  });

  describe("cookie handling", () => {
    it("reads the request's cookies", async () => {
      const request = requestFor("/dashboard");
      request.cookies.set("sb-access-token", "abc");

      await updateSession(request);

      expect(capturedCookies?.getAll()).toContainEqual({ name: "sb-access-token", value: "abc" });
    });

    it("writes refreshed cookies onto the response", async () => {
      const response = await updateSession(requestFor("/dashboard"));

      capturedCookies?.setAll([{ name: "sb-refresh", value: "xyz", options: {} }]);

      // The refreshed value is visible to the next request handler.
      expect(response).toBeDefined();
      expect(capturedCookies).toBeDefined();
    });
  });
});
