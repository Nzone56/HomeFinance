import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";

import { MainNav } from "./main-nav";
import { MonthSwitcher } from "./month-switcher";
import { useSelectedMonth } from "./use-selected-month";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
  useSearchParams: vi.fn(() => new URLSearchParams()),
  useRouter: vi.fn(() => ({ replace })),
}));

const setSearchParams = (query: string) => {
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams(query) as unknown as ReturnType<typeof useSearchParams>,
  );
};

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/dashboard");
  vi.mocked(useRouter).mockReturnValue({ replace } as unknown as ReturnType<typeof useRouter>);
  setSearchParams("");
});

describe("useSelectedMonth", () => {
  it("falls back to the server's month when the URL says nothing", () => {
    const { result } = renderHook(() => useSelectedMonth("2026-09"));

    expect(result.current).toBe("2026-09");
  });

  it("takes the month from the URL", () => {
    setSearchParams("month=2026-03");

    const { result } = renderHook(() => useSelectedMonth("2026-09"));

    expect(result.current).toBe("2026-03");
  });

  it("ignores a hand-edited month that makes no sense", () => {
    setSearchParams("month=banana");

    const { result } = renderHook(() => useSelectedMonth("2026-09"));

    expect(result.current).toBe("2026-09");
  });
});

describe("MainNav", () => {
  it("links to every section of the app", () => {
    render(<MainNav defaultMonth="2026-09" variant="bar" />);

    for (const label of [
      content.nav.dashboard,
      content.nav.expenses,
      content.nav.income,
      content.nav.budget,
      content.nav.settings,
    ]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("carries the selected month across every link", () => {
    setSearchParams("month=2026-03");

    render(<MainNav defaultMonth="2026-09" variant="bar" />);

    expect(screen.getByRole("link", { name: content.nav.income })).toHaveAttribute(
      "href",
      "/income?month=2026-03",
    );
  });

  it("marks the section you are looking at", () => {
    vi.mocked(usePathname).mockReturnValue("/expenses");

    render(<MainNav defaultMonth="2026-09" variant="bar" />);

    expect(screen.getByRole("link", { name: content.nav.expenses })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: content.nav.income })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("renders the same destinations as a mobile tab bar", () => {
    render(<MainNav defaultMonth="2026-09" variant="tabs" />);

    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(screen.getByRole("navigation")).toHaveAccessibleName(content.nav.label);
  });
});

describe("MonthSwitcher", () => {
  it("names the month being viewed", () => {
    render(<MonthSwitcher defaultMonth="2026-09" />);

    expect(screen.getByTestId("current-month")).toHaveTextContent("Septiembre 2026");
  });

  it("steps back a month", async () => {
    render(<MonthSwitcher defaultMonth="2026-09" />);

    await userEvent.click(screen.getByRole("button", { name: content.month.previous }));

    expect(replace).toHaveBeenCalledWith("/dashboard?month=2026-08", { scroll: false });
  });

  it("steps forward a month", async () => {
    render(<MonthSwitcher defaultMonth="2026-09" />);

    await userEvent.click(screen.getByRole("button", { name: content.month.next }));

    expect(replace).toHaveBeenCalledWith("/dashboard?month=2026-10", { scroll: false });
  });

  it("crosses the year boundary", async () => {
    setSearchParams("month=2026-12");

    render(<MonthSwitcher defaultMonth="2026-09" />);
    await userEvent.click(screen.getByRole("button", { name: content.month.next }));

    expect(replace).toHaveBeenCalledWith("/dashboard?month=2027-01", { scroll: false });
  });

  it("keeps other query parameters intact", async () => {
    setSearchParams("month=2026-09&tab=transfers");
    vi.mocked(usePathname).mockReturnValue("/expenses");

    render(<MonthSwitcher defaultMonth="2026-09" />);
    await userEvent.click(screen.getByRole("button", { name: content.month.next }));

    // The existing month keeps its position; only its value changes.
    expect(replace).toHaveBeenCalledWith("/expenses?month=2026-10&tab=transfers", {
      scroll: false,
    });
  });

  it("does not stack history entries while browsing months", async () => {
    render(<MonthSwitcher defaultMonth="2026-09" />);

    await userEvent.click(screen.getByRole("button", { name: content.month.previous }));

    // `replace`, not `push`: six months back should not need six goes at Back.
    expect(replace).toHaveBeenCalled();
  });
});

describe("MonthSwitcher · getting back to now", () => {
  it("offers no way back while you are already there", () => {
    render(<MonthSwitcher defaultMonth="2026-09" />);

    expect(screen.queryByRole("button", { name: content.month.current })).not.toBeInTheDocument();
  });

  it("returns to the current month in one click once you have wandered off", async () => {
    setSearchParams("month=2026-03");

    render(<MonthSwitcher defaultMonth="2026-09" />);
    await userEvent.click(screen.getByRole("button", { name: content.month.current }));

    expect(replace).toHaveBeenCalledWith("/dashboard?month=2026-09", { scroll: false });
  });
});
