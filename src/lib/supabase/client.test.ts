import { createBrowserClient } from "@supabase/ssr";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createBrowserSupabaseClient } from "./client";

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: vi.fn(() => ({ channel: vi.fn() })),
}));

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

describe("createBrowserSupabaseClient", () => {
  it("builds the client from the public environment values", () => {
    createBrowserSupabaseClient();

    expect(createBrowserClient).toHaveBeenCalledWith("https://project.supabase.co", "anon-key");
  });

  it("fails loudly when the environment is not configured", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => createBrowserSupabaseClient()).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_URL",
    );
  });
});
