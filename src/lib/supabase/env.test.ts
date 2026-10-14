import { afterEach, describe, expect, it } from "vitest";

import { supabaseEnv } from "./env";

const ORIGINAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ORIGINAL_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

afterEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ORIGINAL_URL;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = ORIGINAL_KEY;
});

describe("supabaseEnv", () => {
  it("reads both public values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    expect(supabaseEnv()).toEqual({
      url: "https://project.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("names the missing variable so the failure is actionable", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    expect(() => supabaseEnv()).toThrow("Missing environment variable: NEXT_PUBLIC_SUPABASE_URL");
  });

  it("treats an empty value as missing", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://project.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "";

    expect(() => supabaseEnv()).toThrow(
      "Missing environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  });

  it("is read lazily, so importing the module never throws", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(typeof supabaseEnv).toBe("function");
  });
});
