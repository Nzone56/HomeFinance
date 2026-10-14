import { describe, expect, it } from "vitest";

import { content } from "@/content/es";

import { signInSchema } from "./auth";

describe("signInSchema", () => {
  it("accepts an email and a password", () => {
    const result = signInSchema.safeParse({ email: "nzone56@gmail.com", password: "secreto" });

    expect(result.success).toBe(true);
  });

  it("rejects a malformed email, in Spanish", () => {
    const result = signInSchema.safeParse({ email: "nope", password: "secreto" });

    expect(result.success).toBe(false);
    expect(result.error?.issues.at(0)?.message).toBe(content.validation.emailInvalid);
  });

  it("rejects an empty password", () => {
    const result = signInSchema.safeParse({ email: "a@b.com", password: "" });

    expect(result.success).toBe(false);
    expect(result.error?.issues.at(0)?.message).toBe(content.validation.passwordRequired);
  });

  it("rejects a missing field outright", () => {
    expect(signInSchema.safeParse({ email: "a@b.com" }).success).toBe(false);
  });
});
