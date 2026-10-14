import { render, screen, act } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { activeListeners, setDesktop } from "@/test/media";

import { DESKTOP_QUERY, useMediaQuery } from "./use-media-query";

function Probe() {
  return <p>{useMediaQuery(DESKTOP_QUERY) ? "ancho" : "angosto"}</p>;
}

describe("useMediaQuery", () => {
  it("reports what the query currently matches", () => {
    setDesktop(true);
    render(<Probe />);

    expect(screen.getByText("ancho")).toBeInTheDocument();
  });

  it("follows the viewport across the breakpoint", () => {
    render(<Probe />);
    expect(screen.getByText("angosto")).toBeInTheDocument();

    act(() => setDesktop(true));

    expect(screen.getByText("ancho")).toBeInTheDocument();
  });

  it("lets go of its listener when it unmounts", () => {
    const { unmount } = render(<Probe />);
    expect(activeListeners()).toBeGreaterThan(0);

    unmount();

    expect(activeListeners()).toBe(0);
  });

  it("assumes the narrow shape on the server, where there is no viewport", () => {
    // The server has no matchMedia at all, so the snapshot has to answer
    // without touching it — and the client's first render must agree.
    setDesktop(true);

    expect(renderToStaticMarkup(<Probe />)).toBe("<p>angosto</p>");
  });
});
