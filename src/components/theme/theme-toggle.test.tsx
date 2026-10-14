import { render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import { useTheme } from "next-themes";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";

import { ThemeToggle } from "./theme-toggle";

const setTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: vi.fn(() => ({ theme: "system", resolvedTheme: "light", setTheme })),
}));

beforeEach(() => {
  vi.mocked(useTheme).mockReturnValue({
    theme: "system",
    resolvedTheme: "light",
    setTheme,
    themes: [],
  });
});

describe("ThemeToggle", () => {
  it("offers light, dark and system, in Spanish", async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: content.theme.label }));

    expect(screen.getByRole("menuitem", { name: content.theme.light })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: content.theme.dark })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: content.theme.system })).toBeInTheDocument();
  });

  it("switches to dark", async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: content.theme.label }));
    await userEvent.click(screen.getByRole("menuitem", { name: content.theme.dark }));

    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches back to following the system", async () => {
    render(<ThemeToggle />);

    await userEvent.click(screen.getByRole("button", { name: content.theme.label }));
    await userEvent.click(screen.getByRole("menuitem", { name: content.theme.system }));

    expect(setTheme).toHaveBeenCalledWith("system");
  });

  it("marks the theme currently in force", async () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      resolvedTheme: "dark",
      setTheme,
      themes: [],
    });

    render(<ThemeToggle />);
    await userEvent.click(screen.getByRole("button", { name: content.theme.label }));

    expect(screen.getByRole("menuitem", { name: content.theme.dark })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: content.theme.light })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders on the server without guessing the stored theme", () => {
    // The server has no access to the choice, so it renders a placeholder of the
    // same size rather than an icon that would flip on hydration.
    const html = renderToString(<ThemeToggle />);

    expect(html).toContain(content.theme.label);
    expect(html).not.toContain("lucide-moon");
    expect(html).not.toContain("lucide-sun");
  });

  it("shows the moon once a dark theme is in force", () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: "dark",
      resolvedTheme: "dark",
      setTheme,
      themes: [],
    });

    const { container } = render(<ThemeToggle />);

    expect(container.querySelector(".lucide-moon")).toBeInTheDocument();
  });

  it("keeps an accessible name even before the stored choice is known", () => {
    render(<ThemeToggle />);

    expect(screen.getByRole("button", { name: content.theme.label })).toBeInTheDocument();
  });
});
