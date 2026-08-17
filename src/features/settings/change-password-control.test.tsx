import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChangePasswordControl } from "./change-password-control";

const changePassword = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { changePassword: (...args: unknown[]) => changePassword(...args) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function openAndFill(
  user: ReturnType<typeof userEvent.setup>,
  { current = "old-pass-1", next = "new-pass-1", confirm = "new-pass-1" } = {},
) {
  await user.click(screen.getByRole("button", { name: "Change password" }));
  await user.type(screen.getByLabelText("Current password"), current);
  await user.type(screen.getByLabelText("New password"), next);
  await user.type(screen.getByLabelText("Confirm new password"), confirm);
}

describe("ChangePasswordControl", () => {
  it("submits the current and new password on success, then closes", async () => {
    const user = userEvent.setup();
    changePassword.mockResolvedValue({ error: null });
    render(<ChangePasswordControl />);

    await openAndFill(user);
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(changePassword).toHaveBeenCalledWith(
      expect.objectContaining({ currentPassword: "old-pass-1", newPassword: "new-pass-1" }),
    );
    expect(await screen.findByRole("button", { name: "Change password" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
  });

  it("rejects mismatched new passwords without calling the server", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordControl />);

    await openAndFill(user, { next: "new-pass-1", confirm: "different-pass" });
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("New passwords don't match.")).toBeInTheDocument();
    expect(changePassword).not.toHaveBeenCalled();
  });

  it("shows a human error for the wrong current password, marking that field", async () => {
    const user = userEvent.setup();
    changePassword.mockResolvedValue({ error: { code: "INVALID_PASSWORD" } });
    render(<ChangePasswordControl />);

    await openAndFill(user);
    await user.click(screen.getByRole("button", { name: "Update password" }));

    expect(await screen.findByText("Current password is incorrect.")).toBeInTheDocument();
    expect(screen.getByLabelText("Current password")).toHaveAttribute("aria-invalid", "true");
  });

  it("clears the form when reopened after a cancelled edit", async () => {
    const user = userEvent.setup();
    render(<ChangePasswordControl />);

    await user.click(screen.getByRole("button", { name: "Change password" }));
    await user.type(screen.getByLabelText("Current password"), "typed-something");
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Change password" }));
    expect(screen.getByLabelText("Current password")).toHaveValue("");
  });
});
