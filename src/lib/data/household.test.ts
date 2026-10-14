import { redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LOGIN_PATH } from "@/lib/supabase/session";
import { createSupabaseMock, postgrestError, type SupabaseMock } from "@/test/supabase-mock";

import { getHouseholdContext, requireHouseholdContext } from "./household";

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

const household = { id: "household-1", name: "Nuestra casa", created_at: "2026-01-01" };

const memberships = [
  {
    household_id: "household-1",
    user_id: "user-julian",
    role: "owner",
    share_weight: 1,
    joined_at: "2026-01-01",
  },
  {
    household_id: "household-1",
    user_id: "user-gf",
    role: "member",
    share_weight: 1,
    joined_at: "2026-01-02",
  },
];

const profiles = [
  { id: "user-julian", display_name: "Julián", created_at: "2026-01-01" },
  { id: "user-gf", display_name: "GF", created_at: "2026-01-02" },
];

function useMock(mock: SupabaseMock) {
  vi.mocked(createServerSupabaseClient).mockResolvedValue(mock.client);
  return mock;
}

beforeEach(() => {
  vi.mocked(redirect).mockClear();
});

describe("getHouseholdContext", () => {
  it("returns the signed-in user with their household and its members", async () => {
    useMock(
      createSupabaseMock({
        user: { id: "user-julian" },
        tables: { households: [household], household_members: memberships, profiles },
      }),
    );

    const context = await getHouseholdContext();

    expect(context).toEqual({
      userId: "user-julian",
      household,
      members: [
        { userId: "user-julian", displayName: "Julián", role: "owner" },
        { userId: "user-gf", displayName: "GF", role: "member" },
      ],
    });
  });

  it("returns nothing when nobody is signed in", async () => {
    const mock = useMock(createSupabaseMock({ user: null }));

    expect(await getHouseholdContext()).toBeNull();
    // It must not go looking for data it has no right to.
    expect(mock.queries).toHaveLength(0);
  });

  it("returns nothing when the user belongs to no household", async () => {
    // Row Level Security returns no rows rather than an error.
    useMock(createSupabaseMock({ user: { id: "outsider" }, tables: { households: [] } }));

    expect(await getHouseholdContext()).toBeNull();
  });

  it("falls back to the user id when a profile row is missing", async () => {
    useMock(
      createSupabaseMock({
        tables: { households: [household], household_members: memberships, profiles: [] },
      }),
    );

    const context = await getHouseholdContext();

    expect(context?.members.map((member) => member.displayName)).toEqual([
      "user-julian",
      "user-gf",
    ]);
  });

  it("surfaces a database failure instead of rendering empty data", async () => {
    useMock(
      createSupabaseMock({ error: postgrestError("permission denied for table households") }),
    );

    // The three reads run together, so whichever fails first is the one named.
    await expect(getHouseholdContext()).rejects.toThrow("permission denied for table households");
  });
});

describe("requireHouseholdContext", () => {
  it("returns the context when there is one", async () => {
    useMock(
      createSupabaseMock({
        tables: { households: [household], household_members: memberships, profiles },
      }),
    );

    await expect(requireHouseholdContext()).resolves.toMatchObject({ userId: "user-julian" });
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends an unauthenticated caller to the login screen", async () => {
    useMock(createSupabaseMock({ user: null }));

    await expect(requireHouseholdContext()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(LOGIN_PATH);
  });
});
