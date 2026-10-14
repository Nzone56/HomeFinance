import { revalidatePath } from "next/cache";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { requireHouseholdContext } from "@/lib/data/household";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createSupabaseMock, postgrestError } from "@/test/supabase-mock";

import { mutate } from "./mutate";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/data/household", () => ({ requireHouseholdContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createServerSupabaseClient: vi.fn() }));

const context = {
  userId: "user-julian",
  household: { id: "household-1", name: "Nuestra casa", created_at: "2026-01-01" },
  members: [],
};

beforeEach(() => {
  vi.mocked(requireHouseholdContext).mockResolvedValue(context);
  vi.mocked(createServerSupabaseClient).mockResolvedValue(createSupabaseMock().client);
});

describe("mutate", () => {
  it("reports success without re-rendering the page inside the save's own response (regression)", async () => {
    // Re-rendering here tied the reload to the save: a gateway timeout while
    // reloading reported a saved card payment as an error.
    const state = await mutate(async () => null, "Guardado");

    expect(state).toEqual({ status: "success", message: "Guardado" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("hands the write the household resolved from the session", async () => {
    const run = vi.fn(async () => null);

    await mutate(run, "Guardado");

    // The household never comes from the submitted form.
    expect(run).toHaveBeenCalledWith(context, expect.anything());
  });

  it("turns a database rejection into renderable state", async () => {
    const state = await mutate(async () => postgrestError(), "Guardado");

    expect(state).toEqual({
      status: "error",
      message: content.common.genericError,
      fieldErrors: {},
      values: {},
    });
  });

  it("lets an unauthenticated caller's redirect propagate", async () => {
    vi.mocked(requireHouseholdContext).mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(mutate(async () => null, "Guardado")).rejects.toThrow("NEXT_REDIRECT");
  });
});
