import { render, screen } from "@testing-library/react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "./theme-provider";

vi.mock("next-themes", () => ({
  ThemeProvider: vi.fn(({ children }: { children: React.ReactNode }) => <div>{children}</div>),
}));

describe("ThemeProvider", () => {
  it("renders the app inside it", () => {
    render(
      <ThemeProvider>
        <p>Contenido</p>
      </ThemeProvider>,
    );

    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("drives the theme through the class the Tailwind tokens key off", () => {
    render(
      <ThemeProvider>
        <p>Contenido</p>
      </ThemeProvider>,
    );

    expect(NextThemesProvider).toHaveBeenCalledWith(
      expect.objectContaining({ attribute: "class", defaultTheme: "system", enableSystem: true }),
      undefined,
    );
  });

  it("suppresses the transition flash when the theme changes", () => {
    render(
      <ThemeProvider>
        <p>Contenido</p>
      </ThemeProvider>,
    );

    expect(NextThemesProvider).toHaveBeenCalledWith(
      expect.objectContaining({ disableTransitionOnChange: true }),
      undefined,
    );
  });

  it("renders the theme script inert on the client so React 19 does not warn about it", () => {
    render(
      <ThemeProvider>
        <p>Contenido</p>
      </ThemeProvider>,
    );

    expect(NextThemesProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        scriptProps: { type: "application/json", suppressHydrationWarning: true },
      }),
      undefined,
    );
  });

  it("leaves the theme script executable in the server HTML so the theme applies before first paint", async () => {
    vi.resetModules();
    vi.stubGlobal("window", undefined);

    try {
      const { THEME_SCRIPT_PROPS } = await import("./theme-provider");
      expect(THEME_SCRIPT_PROPS).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
