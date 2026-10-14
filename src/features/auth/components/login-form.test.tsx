import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { content } from "@/content/es";
import { signIn } from "@/features/auth/actions";
import { errorState, formValues } from "@/lib/actions/state";

import { LoginForm } from "./login-form";

vi.mock("@/features/auth/actions", () => ({
  signIn: vi.fn(async () => errorState(content.auth.failed)),
}));

describe("LoginForm", () => {
  it("asks for an email and a password", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(content.auth.email)).toHaveAttribute("type", "email");
    expect(screen.getByLabelText(content.auth.password)).toHaveAttribute("type", "password");
  });

  it("lets a password manager fill it in", () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(content.auth.email)).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText(content.auth.password)).toHaveAttribute(
      "autocomplete",
      "current-password",
    );
  });

  it("sends the credentials to the action", async () => {
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText(content.auth.email), "test1@test.com");
    await userEvent.type(screen.getByLabelText(content.auth.password), "secreto");
    await userEvent.click(screen.getByRole("button", { name: content.auth.submit }));

    await waitFor(() => expect(signIn).toHaveBeenCalled());
    const posted = vi.mocked(signIn).mock.calls.at(0)?.[1];
    expect(posted?.get("email")).toBe("test1@test.com");
    expect(posted?.get("password")).toBe("secreto");
  });

  it("shows why the sign-in failed", async () => {
    render(<LoginForm />);

    await userEvent.click(screen.getByRole("button", { name: content.auth.submit }));

    expect(await screen.findByRole("alert")).toHaveTextContent(content.auth.failed);
  });

  it("keeps the email but never the password when the attempt fails", async () => {
    vi.mocked(signIn).mockImplementation(async (_state, formData) => {
      const values = formValues(formData);
      // The action deliberately echoes only what is safe to put back on screen.
      delete values.password;
      return errorState(content.auth.failed, {}, values);
    });

    render(<LoginForm />);
    await userEvent.type(screen.getByLabelText(content.auth.email), "test1@test.com");
    await userEvent.type(screen.getByLabelText(content.auth.password), "secreto");
    await userEvent.click(screen.getByRole("button", { name: content.auth.submit }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByLabelText(content.auth.email)).toHaveValue("test1@test.com");
    expect(screen.getByLabelText(content.auth.password)).toHaveValue("");
  });

  it("shows field messages when the form itself is wrong", async () => {
    vi.mocked(signIn).mockResolvedValue(
      errorState(content.validation.formInvalid, { email: content.validation.emailInvalid }),
    );

    render(<LoginForm />);
    await userEvent.click(screen.getByRole("button", { name: content.auth.submit }));

    await waitFor(() =>
      expect(screen.getByLabelText(content.auth.email)).toHaveAttribute("aria-invalid", "true"),
    );
  });
});
