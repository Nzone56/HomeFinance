import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { IDLE_STATE } from "@/lib/actions/state";
import { DEFAULT_AUTHENTICATED_PATH, LOGIN_PATH } from "@/lib/supabase/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseMock, type SupabaseMock } from "@/test/supabase-mock";

import { devSignIn, signIn, signOut } from "./actions";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

let mock: SupabaseMock;

function formOf(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

const credentials = { email: "nzone56@gmail.com", password: "secreto" };

beforeEach(() => {
  mock = createSupabaseMock();
  vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);
});

describe("signIn", () => {
  it("signs in and sends the user to the dashboard", async () => {
    await expect(signIn(IDLE_STATE, formOf(credentials))).rejects.toThrow("NEXT_REDIRECT");

    expect(mock.signInWithPassword).toHaveBeenCalledWith(credentials);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith(DEFAULT_AUTHENTICATED_PATH);
  });

  it("reports a failed sign-in without saying which half was wrong", async () => {
    mock = createSupabaseMock({ signInError: { message: "Invalid login credentials" } });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);

    const state = await signIn(IDLE_STATE, formOf(credentials));

    // Naming the wrong half would let someone discover who has an account.
    expect(state).toEqual({
      status: "error",
      message: content.auth.failed,
      fieldErrors: {},
      values: {},
    });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("validates the form before reaching the auth service", async () => {
    const state = await signIn(IDLE_STATE, formOf({ email: "nope", password: "" }));

    expect(state).toMatchObject({
      status: "error",
      fieldErrors: {
        email: content.validation.emailInvalid,
        password: content.validation.passwordRequired,
      },
    });
    expect(mock.signInWithPassword).not.toHaveBeenCalled();
  });

  it("never starts a session on an invalid form", async () => {
    await signIn(IDLE_STATE, formOf({ email: "", password: "" }));

    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("devSignIn", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function configureDevLogin(nodeEnv: string) {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.stubEnv("DEV_LOGIN_EMAIL", credentials.email);
    vi.stubEnv("DEV_LOGIN_PASSWORD", credentials.password);
  }

  it("signs in with the configured test account while developing", async () => {
    configureDevLogin("development");

    await expect(devSignIn()).rejects.toThrow("NEXT_REDIRECT");

    expect(mock.signInWithPassword).toHaveBeenCalledWith(credentials);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith(DEFAULT_AUTHENTICATED_PATH);
  });

  it("refuses to sign anyone in outside development", async () => {
    configureDevLogin("production");

    await expect(devSignIn()).resolves.toMatchObject({
      status: "error",
      message: content.auth.failed,
    });

    expect(mock.signInWithPassword).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("says so when the test account is rejected, instead of looking like a dead button (regression)", async () => {
    configureDevLogin("development");
    mock = createSupabaseMock({ signInError: { message: "Invalid login credentials" } });
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);

    await expect(devSignIn()).resolves.toMatchObject({
      status: "error",
      message: content.auth.failed,
    });

    expect(revalidatePath).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("signOut", () => {
  it("ends the session and returns to the login screen", async () => {
    await expect(signOut()).rejects.toThrow("NEXT_REDIRECT");

    expect(mock.signOut).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(redirect).toHaveBeenCalledWith(LOGIN_PATH);
  });
});
