import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "./sign-in-form";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

const signInEmail = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { signIn: { email: (...args: unknown[]) => signInEmail(...args) } },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "dor@example.com");
  await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

describe("SignInForm", () => {
  it("uses real input labels and correct autofill/password-manager attributes", () => {
    render(<SignInForm />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("autoComplete", "email");
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("autoComplete", "current-password");
    expect(password).toHaveAttribute("type", "password");
  });

  it("navigates to Home on success when there is no return destination", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({ error: null });
    render(<SignInForm />);

    await fillAndSubmit(user);

    expect(signInEmail).toHaveBeenCalledWith({
      email: "dor@example.com",
      password: "correct horse battery staple",
    });
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
  });

  it("navigates to the preserved return destination on success", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({ error: null });
    render(<SignInForm next="/library" />);

    await fillAndSubmit(user);

    expect(push).toHaveBeenCalledWith("/library");
  });

  it("shows a human error message and marks both fields for invalid credentials", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({
      error: { code: "INVALID_EMAIL_OR_PASSWORD", status: 401 },
    });
    render(<SignInForm />);

    await fillAndSubmit(user);

    expect(screen.getByText("Invalid email or password.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(push).not.toHaveBeenCalled();
  });

  it("preserves the entered email after a failed attempt", async () => {
    const user = userEvent.setup();
    signInEmail.mockResolvedValue({ error: { code: "INVALID_EMAIL_OR_PASSWORD" } });
    render(<SignInForm />);

    await fillAndSubmit(user);

    expect(screen.getByLabelText("Email")).toHaveValue("dor@example.com");
  });

  it("shows a password visibility toggle that is keyboard accessible", async () => {
    const user = userEvent.setup();
    render(<SignInForm />);

    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
  });
});
