import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Amount } from "./amount";

describe("Amount", () => {
  it("renders a formatted peso figure", () => {
    render(<Amount value={80_000} />);

    expect(screen.getByText("$ 80.000")).toBeInTheDocument();
  });

  it("shortens large figures when asked", () => {
    render(<Amount value={7_400_000} compact />);

    expect(screen.getByText("$7,4 M")).toBeInTheDocument();
  });

  it("marks a surplus with a plus sign when the direction matters", () => {
    render(<Amount value={500_000} signed />);

    expect(screen.getByText("+$ 500.000")).toBeInTheDocument();
  });

  it("keeps the sign when shortened, since a variance is about direction", () => {
    const { rerender } = render(<Amount value={40_000} compact signed />);
    expect(screen.getByText("+$40 K")).toBeInTheDocument();

    rerender(<Amount value={-600_000} compact signed />);
    expect(screen.getByText("-$600 K")).toBeInTheDocument();
  });

  it("does not sign a shortened zero", () => {
    render(<Amount value={0} compact signed />);
    expect(screen.getByText("$ 0")).toBeInTheDocument();
  });

  it("lines figures up on their digits", () => {
    render(<Amount value={1000} />);

    expect(screen.getByText("$ 1.000")).toHaveClass("tabular-nums");
  });

  describe("tone", () => {
    it("leaves the colour alone by default", () => {
      render(<Amount value={-1000} />);

      const element = screen.getByText("-$ 1.000");
      expect(element).not.toHaveClass("text-destructive");
    });

    it("plays a figure down when muted", () => {
      render(<Amount value={1000} tone="muted" />);

      expect(screen.getByText("$ 1.000")).toHaveClass("text-muted-foreground");
    });

    it("colours a gain as good and a loss as bad", () => {
      const { rerender } = render(<Amount value={1000} tone="auto" />);
      expect(screen.getByText("$ 1.000").className).toContain("emerald");

      rerender(<Amount value={-1000} tone="auto" />);
      expect(screen.getByText("-$ 1.000")).toHaveClass("text-destructive");
    });

    it("inverts that where more is worse, such as overspending", () => {
      const { rerender } = render(<Amount value={1000} tone="auto-inverse" />);
      expect(screen.getByText("$ 1.000")).toHaveClass("text-destructive");

      rerender(<Amount value={-1000} tone="auto-inverse" />);
      expect(screen.getByText("-$ 1.000").className).toContain("emerald");
    });

    it("treats exactly on-plan as neither good nor bad", () => {
      render(<Amount value={0} tone="auto" />);

      expect(screen.getByText("$ 0")).toHaveClass("text-muted-foreground");
    });
  });

  it("accepts extra classes from the caller", () => {
    render(<Amount value={1000} className="text-2xl" />);

    expect(screen.getByText("$ 1.000")).toHaveClass("text-2xl");
  });
});
