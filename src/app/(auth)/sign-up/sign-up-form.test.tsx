import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignUpForm } from "./sign-up-form";

const push = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }));

const signUpEmail = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { signUp: { email: (...args: unknown[]) => signUpEmail(...args) } },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Name"), "Dor Shaul");
  await user.type(screen.getByLabelText("Email"), "dor@example.com");
  await user.type(screen.getByLabelText("Password"), "correct horse battery staple");
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignUpForm", () => {
  it("asks for exactly name, email, and password — nothing more", () => {
    render(<SignUpForm />);
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
  });

  it("uses correct autofill/password-manager attributes for a new account", () => {
    render(<SignUpForm />);
    expect(screen.getByLabelText("Email")).toHaveAttribute("autoComplete", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autoComplete", "new-password");
  });

  it("enters the product directly on success (no intermediate success screen)", async () => {
    const user = userEvent.setup();
    signUpEmail.mockResolvedValue({ error: null });
    render(<SignUpForm />);

    await fillAndSubmit(user);

    expect(signUpEmail).toHaveBeenCalledWith({
      name: "Dor Shaul",
      email: "dor@example.com",
      password: "correct horse battery staple",
    });
    expect(push).toHaveBeenCalledWith("/");
    expect(refresh).toHaveBeenCalled();
  });

  it("navigates to the preserved return destination on success", async () => {
    const user = userEvent.setup();
    signUpEmail.mockResolvedValue({ error: null });
    render(<SignUpForm next="/discover" />);

    await fillAndSubmit(user);

    expect(push).toHaveBeenCalledWith("/discover");
  });

  it("shows a human error for an existing account, marking only the email field", async () => {
    const user = userEvent.setup();
    signUpEmail.mockResolvedValue({
      error: { code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" },
    });
    render(<SignUpForm />);

    await fillAndSubmit(user);

    expect(screen.getByText("An account with this email already exists.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
    expect(push).not.toHaveBeenCalled();
  });

  it("enters a pending state while submitting", async () => {
    const user = userEvent.setup();
    let resolveSignUp: (value: { error: null }) => void = () => {};
    signUpEmail.mockReturnValue(
      new Promise((resolve) => {
        resolveSignUp = resolve;
      }),
    );
    render(<SignUpForm />);

    await fillAndSubmit(user);
    expect(screen.getByRole("button", { name: /Create account/ })).toBeDisabled();

    resolveSignUp({ error: null });
  });
});
