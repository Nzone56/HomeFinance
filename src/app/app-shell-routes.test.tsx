import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { redirect } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { ROUTES } from "@/lib/routes";

import ErrorBoundary from "./error";
import RootLayout, { metadata, viewport } from "./layout";
import manifest from "./manifest";
import NotFound from "./not-found";
import RootPage from "./page";
import robots from "./robots";

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "--font-sans" }),
  Geist_Mono: () => ({ variable: "--font-mono" }),
}));

describe("RootPage", () => {
  it("sends visitors straight to the dashboard — there is no public page", () => {
    expect(() => RootPage()).toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith(ROUTES.dashboard);
  });
});

describe("RootLayout", () => {
  it("renders the app in Spanish", () => {
    const tree = RootLayout({ children: null });

    expect(tree.props.lang).toBe("es");
  });

  it("lets the theme script get ahead of React without a hydration warning", () => {
    const tree = RootLayout({ children: null });

    expect(tree.props.suppressHydrationWarning).toBe(true);
  });
});

describe("metadata", () => {
  it("keeps a private ledger out of every search index", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });

  it("points at the manifest so the app can be installed", () => {
    expect(metadata.manifest).toBe("/manifest.webmanifest");
  });

  it("names the app in Spanish", () => {
    expect(metadata.description).toBe(content.app.description);
  });
});

describe("viewport", () => {
  it("fits a phone screen, notch included", () => {
    expect(viewport.width).toBe("device-width");
    expect(viewport.viewportFit).toBe("cover");
  });

  it("carries a theme colour for each scheme", () => {
    expect(viewport.themeColor).toHaveLength(2);
  });
});

describe("manifest", () => {
  it("installs as a standalone app in Spanish", () => {
    const result = manifest();

    expect(result.display).toBe("standalone");
    expect(result.lang).toBe("es-CO");
    expect(result.name).toBe(content.app.name);
  });

  it("opens on the dashboard once installed", () => {
    expect(manifest().start_url).toBe("/dashboard");
  });

  it("ships an icon for every place one is needed, maskable included", () => {
    const icons = manifest().icons ?? [];

    expect(icons.map((icon) => icon.sizes)).toContain("192x192");
    expect(icons.map((icon) => icon.sizes)).toContain("512x512");
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});

describe("robots", () => {
  it("asks every crawler to stay out", () => {
    expect(robots().rules).toEqual([{ userAgent: "*", disallow: "/" }]);
  });
});

describe("ErrorBoundary", () => {
  it("says something went wrong rather than showing half a dashboard", () => {
    render(<ErrorBoundary error={new Error("boom")} reset={vi.fn()} />);

    expect(screen.getByText(content.errors.title)).toBeInTheDocument();
    expect(screen.getByText(content.errors.description)).toBeInTheDocument();
  });

  it("offers a retry", async () => {
    const reset = vi.fn();
    render(<ErrorBoundary error={new Error("boom")} reset={reset} />);

    await userEvent.click(screen.getByRole("button", { name: content.errors.retry }));

    expect(reset).toHaveBeenCalled();
  });
});

describe("NotFound", () => {
  it("explains the link is gone and offers a way back", () => {
    render(<NotFound />);

    expect(screen.getByText(content.errors.notFoundTitle)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: content.errors.backToDashboard })).toHaveAttribute(
      "href",
      ROUTES.dashboard,
    );
  });
});
