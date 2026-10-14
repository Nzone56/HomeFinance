import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";

import LoginPage, { metadata } from "./page";

vi.mock("@/features/auth/actions", () => ({ signIn: vi.fn(), devSignIn: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("LoginPage", () => {
  it("offers one-click sign-in with the test account while developing", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DEV_LOGIN_EMAIL", "test@example.com");
    vi.stubEnv("DEV_LOGIN_PASSWORD", "secreto");

    render(<LoginPage />);

    expect(screen.getByRole("button", { name: content.auth.devLogin })).toBeInTheDocument();
    expect(screen.getByText(content.auth.devLoginHint)).toBeInTheDocument();
  });

  it("never offers the shortcut in a production build", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DEV_LOGIN_EMAIL", "test@example.com");
    vi.stubEnv("DEV_LOGIN_PASSWORD", "secreto");

    render(<LoginPage />);

    expect(screen.queryByRole("button", { name: content.auth.devLogin })).not.toBeInTheDocument();
  });

  it("names the app and says what signing in is for", () => {
    render(<LoginPage />);

    expect(screen.getByText(content.auth.title)).toBeInTheDocument();
    expect(screen.getByText(content.auth.subtitle)).toBeInTheDocument();
  });

  it("carries the sign-in form", () => {
    render(<LoginPage />);

    expect(screen.getByLabelText(content.auth.email)).toBeInTheDocument();
    expect(screen.getByLabelText(content.auth.password)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: content.auth.submit })).toBeInTheDocument();
  });

  it("says plainly that the app is private", () => {
    render(<LoginPage />);

    expect(screen.getByText(content.auth.privateNotice)).toBeInTheDocument();
  });

  it("shows the app icon without announcing it to a screen reader", () => {
    const { container } = render(<LoginPage />);

    // An empty alt takes it out of the accessibility tree, which is right for
    // decoration that sits beside the title it illustrates.
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("titles the page for the browser tab", () => {
    expect(metadata.title).toBe(content.auth.submit);
  });
});
