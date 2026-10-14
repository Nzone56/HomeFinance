import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireHouseholdContext } from "@/lib/data/household";
import { GF, JULIAN } from "@/test/factories";

import { HouseholdName, SignedInMember } from "./shell-identity";

vi.mock("@/lib/data/household", () => ({ requireHouseholdContext: vi.fn() }));

const context = {
  userId: JULIAN,
  household: { id: "household-1", name: "Nuestra casa", created_at: "2026-01-01" },
  members: [
    { userId: JULIAN, displayName: "Julián", role: "owner" as const },
    { userId: GF, displayName: "GF", role: "member" as const },
  ],
};

beforeEach(() => {
  vi.mocked(requireHouseholdContext).mockResolvedValue(context);
});

describe("HouseholdName", () => {
  it("names the household, checking the session on the server to do it", async () => {
    render(await HouseholdName());

    expect(requireHouseholdContext).toHaveBeenCalled();
    expect(screen.getByText("Nuestra casa")).toBeInTheDocument();
  });
});

describe("SignedInMember", () => {
  it("wears the signed-in member's own mark", async () => {
    render(await SignedInMember());

    expect(screen.getByTitle("Julián")).toBeInTheDocument();
  });

  it("copes with a session whose profile has not landed yet", async () => {
    // An invited account can reach the app before its profile row exists.
    vi.mocked(requireHouseholdContext).mockResolvedValue({ ...context, members: [] });

    render(await SignedInMember());

    expect(screen.getByTitle("")).toHaveTextContent("?");
  });
});
