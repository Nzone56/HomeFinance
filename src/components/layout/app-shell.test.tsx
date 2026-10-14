import { render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

import { AppShell } from "./app-shell";
import { RealtimeRefresh } from "./realtime-refresh";

const refresh = vi.fn();
const removeChannel = vi.fn();
const subscribe = vi.fn();
const on = vi.fn((_event: string, _filter: object, _handler: () => void) => ({ subscribe }));
const channel = vi.fn(() => ({ on }));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ refresh, replace: vi.fn() })),
}));

vi.mock("next/themes", () => ({
  useTheme: vi.fn(() => ({ theme: "system", resolvedTheme: "light", setTheme: vi.fn() })),
}));

vi.mock("@/lib/supabase/client", () => ({
  createBrowserSupabaseClient: vi.fn(() => ({ channel, removeChannel })),
}));

vi.mock("@/features/auth/actions", () => ({ signOut: vi.fn() }));

describe("AppShell", () => {
  it("names the household", () => {
    render(
      <AppShell
        month="2026-09"
        householdName="Nuestra casa"
        userMark={<span title="Julián">JU</span>}
      >
        <p>Contenido</p>
      </AppShell>,
    );

    expect(screen.getByText("Nuestra casa")).toBeInTheDocument();
  });

  it("renders the page inside it", () => {
    render(
      <AppShell
        month="2026-09"
        householdName="Nuestra casa"
        userMark={<span title="Julián">JU</span>}
      >
        <p>Contenido</p>
      </AppShell>,
    );

    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("offers the month being viewed", () => {
    render(
      <AppShell
        month="2026-09"
        householdName="Nuestra casa"
        userMark={<span title="Julián">JU</span>}
      >
        <p>Contenido</p>
      </AppShell>,
    );

    expect(screen.getByTestId("current-month")).toHaveTextContent("Septiembre 2026");
  });

  it("offers a way out and a way to change the theme", () => {
    render(
      <AppShell
        month="2026-09"
        householdName="Nuestra casa"
        userMark={<span title="Julián">JU</span>}
      >
        <p>Contenido</p>
      </AppShell>,
    );

    expect(screen.getByRole("button", { name: content.nav.signOut })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: content.theme.label })).toBeInTheDocument();
  });

  it("carries the navigation twice, so nothing is unreachable on a phone", () => {
    render(
      <AppShell
        month="2026-09"
        householdName="Nuestra casa"
        userMark={<span title="Julián">JU</span>}
      >
        <p>Contenido</p>
      </AppShell>,
    );

    // One bar for desktop, one tab strip for mobile — same destinations.
    expect(screen.getAllByRole("navigation", { name: content.nav.label })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: content.nav.dashboard })).toHaveLength(2);
  });
});

describe("RealtimeRefresh", () => {
  it("subscribes to the household's changes", () => {
    render(<RealtimeRefresh />);

    expect(createBrowserSupabaseClient).toHaveBeenCalled();
    expect(channel).toHaveBeenCalledWith("household-data");
    expect(on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public" },
      expect.any(Function),
    );
    expect(subscribe).toHaveBeenCalled();
  });

  it("re-renders the page rather than holding a second copy of the data", () => {
    render(<RealtimeRefresh />);

    on.mock.calls.at(0)?.[2]?.();

    expect(refresh).toHaveBeenCalled();
  });

  it("lets go of the channel when it unmounts", () => {
    const { unmount } = render(<RealtimeRefresh />);

    unmount();

    expect(removeChannel).toHaveBeenCalled();
  });

  it("renders nothing of its own", () => {
    const { container } = render(<RealtimeRefresh />);

    expect(container).toBeEmptyDOMElement();
  });

  it("re-subscribes if the router changes", () => {
    const { rerender } = render(<RealtimeRefresh />);
    vi.mocked(useRouter).mockReturnValue({
      refresh,
      replace: vi.fn(),
    } as unknown as ReturnType<typeof useRouter>);

    rerender(<RealtimeRefresh />);

    expect(channel).toHaveBeenCalled();
  });
});
