import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DisplayNameSetting } from "./display-name-setting";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const updateUser = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { updateUser: (...args: unknown[]) => updateUser(...args) },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DisplayNameSetting", () => {
  it("saves the new name on blur", async () => {
    const user = userEvent.setup();
    updateUser.mockResolvedValue({ error: null });
    render(<DisplayNameSetting value="Dor Shaul" />);

    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.type(input, "Dor S.");
    await user.tab();

    expect(updateUser).toHaveBeenCalledWith({ name: "Dor S." });
    expect(refresh).toHaveBeenCalled();
  });

  it("saves on Enter, not just blur", async () => {
    const user = userEvent.setup();
    updateUser.mockResolvedValue({ error: null });
    render(<DisplayNameSetting value="Dor Shaul" />);

    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.type(input, "Dor S.{Enter}");

    expect(updateUser).toHaveBeenCalledWith({ name: "Dor S." });
  });

  it("is a silent no-op when the value didn't actually change", async () => {
    const user = userEvent.setup();
    render(<DisplayNameSetting value="Dor Shaul" />);

    await user.click(screen.getByLabelText("Display name"));
    await user.tab();

    expect(updateUser).not.toHaveBeenCalled();
  });

  it("reverts to the last saved value rather than saving an emptied field", async () => {
    const user = userEvent.setup();
    render(<DisplayNameSetting value="Dor Shaul" />);

    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.tab();

    expect(updateUser).not.toHaveBeenCalled();
    expect(input).toHaveValue("Dor Shaul");
  });

  it("shows an inline error and keeps the typed value when the save fails", async () => {
    const user = userEvent.setup();
    updateUser.mockResolvedValue({ error: { code: "SOMETHING" } });
    render(<DisplayNameSetting value="Dor Shaul" />);

    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.type(input, "Dor S.");
    await user.tab();

    expect(await screen.findByText("Couldn't save your name. Try again.")).toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("Escape reverts the draft without saving", async () => {
    const user = userEvent.setup();
    render(<DisplayNameSetting value="Dor Shaul" />);

    const input = screen.getByLabelText("Display name");
    await user.clear(input);
    await user.type(input, "Something else");
    await user.keyboard("{Escape}");

    expect(input).toHaveValue("Dor Shaul");
    expect(updateUser).not.toHaveBeenCalled();
  });
});
