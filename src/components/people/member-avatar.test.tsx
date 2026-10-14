import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MemberAvatar } from "./member-avatar";

describe("MemberAvatar", () => {
  it("shows the member's initials", () => {
    render(<MemberAvatar name="Julián Pereira" color="var(--chart-1)" />);

    expect(screen.getByTitle("Julián Pereira")).toHaveTextContent("JP");
  });

  it("wears the member's own colour", () => {
    render(<MemberAvatar name="GF" color="var(--chart-2)" />);

    // Asserted on the attribute: jsdom does not resolve a custom property.
    expect(screen.getByTitle("GF").getAttribute("style")).toContain("var(--chart-2)");
  });

  it("stays out of the accessibility tree beside a visible name", () => {
    render(<MemberAvatar name="Julián" color="var(--chart-1)" />);

    // The name is already on screen next to it; reading it twice is noise.
    expect(screen.getByTitle("Julián")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByText("Julián", { selector: ".sr-only" })).not.toBeInTheDocument();
  });

  it("names the member when the mark stands alone", () => {
    render(<MemberAvatar name="Julián" color="var(--chart-1)" labelled />);

    expect(screen.getByTitle("Julián")).not.toHaveAttribute("aria-hidden");
    expect(screen.getByText("Julián")).toBeInTheDocument();
  });

  it("comes in a larger size where there is room for it", () => {
    render(<MemberAvatar name="Julián" color="var(--chart-1)" size="md" />);

    expect(screen.getByTitle("Julián")).toHaveClass("size-9");
  });
});
