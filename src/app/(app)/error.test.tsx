import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";

import AppError from "./error";

describe("AppError", () => {
  it("says a failed reload has not lost anything that was saved", () => {
    // A gateway timeout while reloading after a card payment used to read as a
    // failed save, inviting the payment to be entered twice (regression).
    render(<AppError error={new Error("load household: Gateway Timeout")} retry={vi.fn()} />);

    expect(screen.getByText(content.errors.refreshTitle)).toBeInTheDocument();
    expect(screen.getByText(content.errors.refreshDescription)).toBeInTheDocument();
  });

  it("tries the page again", async () => {
    const retry = vi.fn();
    render(<AppError error={new Error("boom")} retry={retry} />);

    await userEvent.click(screen.getByRole("button", { name: content.errors.retry }));

    expect(retry).toHaveBeenCalled();
  });
});
