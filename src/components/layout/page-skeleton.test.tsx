import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { content } from "@/content/es";

import { PageSkeleton } from "./page-skeleton";

describe("PageSkeleton", () => {
  it("tells assistive technology the page is loading", () => {
    const { container } = render(<PageSkeleton layout="cards" title="Plan" />);

    expect(screen.getByRole("status")).toHaveTextContent(content.common.loading);
    expect(container.firstChild).toHaveAttribute("aria-busy", "true");
  });

  it("shows the real heading, which is known before the data is", () => {
    render(<PageSkeleton layout="list" title="Gastos" subtitle="Septiembre 2026" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("GastosSeptiembre 2026");
  });

  it("leaves the subtitle out when there is none", () => {
    render(<PageSkeleton layout="cards" title="Plan" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/^Plan$/);
  });

  it("holds the place of a heading it cannot know yet", () => {
    const { container } = render(<PageSkeleton layout="dashboard" />);

    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    // Four headline tiles and the charts beneath them.
    expect(container.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(4);
  });

  it("sketches a list as rows", () => {
    const { container } = render(<PageSkeleton layout="list" title="Gastos" />);

    expect(container.querySelectorAll(".divide-y > div")).toHaveLength(5);
  });
});
