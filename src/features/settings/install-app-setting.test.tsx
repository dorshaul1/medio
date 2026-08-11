import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { InstallPromotionState } from "@/features/install/install-policy";
import { InstallAppSetting } from "./install-app-setting";

const useInstall = vi.fn();
vi.mock("@/features/install/install-provider", () => ({
  useInstall: () => useInstall(),
}));

function mockState(state: InstallPromotionState, promptInstall = vi.fn()) {
  useInstall.mockReturnValue({ state, promptInstall });
  return promptInstall;
}

describe("InstallAppSetting", () => {
  it.each([
    ["not-promoted", { kind: "not-promoted" as const }],
    ["installed", { kind: "installed" as const }],
    ["unsupported", { kind: "unsupported" as const }],
  ])("renders nothing when the install state is %s", (_label, state) => {
    mockState(state);
    const { container } = render(<InstallAppSetting />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers a direct Install action and invokes the real prompt on click", async () => {
    const user = userEvent.setup();
    const promptInstall = mockState({ kind: "direct" });
    render(<InstallAppSetting />);

    expect(screen.getByText("Install MEDIO")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Install" }));
    expect(promptInstall).toHaveBeenCalledTimes(1);
  });

  it("offers manual instructions instead of a direct prompt on iOS Safari", async () => {
    const user = userEvent.setup();
    const promptInstall = mockState({ kind: "manual" });
    render(<InstallAppSetting />);

    await user.click(screen.getByRole("button", { name: "How to install" }));
    expect(promptInstall).not.toHaveBeenCalled();
    expect(screen.getByText(/Add to Home Screen/)).toBeInTheDocument();
  });
});
