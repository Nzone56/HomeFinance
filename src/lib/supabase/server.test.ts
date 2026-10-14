import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "./server";

interface CookieOptions {
  getAll: () => { name: string; value: string }[];
  setAll: (cookies: { name: string; value: string; options?: object }[]) => void;
}

let capturedCookies: CookieOptions | undefined;

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url: string, _key: string, options: { cookies: CookieOptions }) => {
    capturedCookies = options.cookies;
    return { from: vi.fn() };
  }),
}));

const cookieStore = {
  getAll: vi.fn(() => [{ name: "sb-access-token", value: "abc" }]),
  set: vi.fn(),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  capturedCookies = undefined;
  cookieStore.set.mockReset();
  cookieStore.set.mockImplementation(() => undefined);
});

describe("createServerSupabaseClient", () => {
  it("binds the client to the caller's session cookies", async () => {
    await createServerSupabaseClient();

    expect(createServerClient).toHaveBeenCalledWith(
      "https://project.supabase.co",
      "anon-key",
      expect.objectContaining({ cookies: expect.anything() }),
    );
    expect(capturedCookies?.getAll()).toEqual([{ name: "sb-access-token", value: "abc" }]);
  });

  it("marks the route dynamic before reading the environment", async () => {
    // `cookies()` must be awaited first, or a build would try to prerender a
    // page that is inherently per-user.
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    await expect(createServerSupabaseClient()).rejects.toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL",
    );
    expect(cookies).toHaveBeenCalled();
  });

  it("writes refreshed cookies back to the store", async () => {
    await createServerSupabaseClient();

    capturedCookies?.setAll([{ name: "sb-refresh", value: "xyz", options: { path: "/" } }]);

    expect(cookieStore.set).toHaveBeenCalledWith("sb-refresh", "xyz", { path: "/" });
  });

  it("ignores the write when a Server Component cannot set cookies", async () => {
    cookieStore.set.mockImplementation(() => {
      throw new Error("Cookies can only be modified in a Server Action or Route Handler");
    });

    await createServerSupabaseClient();

    // The proxy refreshes the session on every request, so swallowing this is
    // safe — and throwing here would break every page render.
    expect(() => capturedCookies?.setAll([{ name: "sb-refresh", value: "xyz" }])).not.toThrow();
  });
});
