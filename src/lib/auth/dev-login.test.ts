import { afterEach, describe, expect, it, vi } from "vitest";

import { devLoginCredentials } from "./dev-login";

afterEach(() => {
  vi.unstubAllEnvs();
});

function configure(nodeEnv: string, email: string, password: string) {
  vi.stubEnv("NODE_ENV", nodeEnv);
  vi.stubEnv("DEV_LOGIN_EMAIL", email);
  vi.stubEnv("DEV_LOGIN_PASSWORD", password);
}

describe("devLoginCredentials", () => {
  it("offers the test account while developing", () => {
    configure("development", "test@example.com", "secreto");

    expect(devLoginCredentials()).toEqual({ email: "test@example.com", password: "secreto" });
  });

  it("never offers it in a production build, even when configured", () => {
    configure("production", "test@example.com", "secreto");

    expect(devLoginCredentials()).toBeNull();
  });

  it("offers nothing when the email is missing", () => {
    configure("development", "", "secreto");

    expect(devLoginCredentials()).toBeNull();
  });

  it("offers nothing when the password is missing", () => {
    configure("development", "test@example.com", "");

    expect(devLoginCredentials()).toBeNull();
  });

  it("offers nothing when the variables are not set at all", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_LOGIN_EMAIL", undefined);
    vi.stubEnv("DEV_LOGIN_PASSWORD", undefined);

    expect(devLoginCredentials()).toBeNull();
  });
});
