import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppUpdateSetting } from "./app-update-setting";

const useServiceWorkerUpdateMock = vi.fn();
vi.mock("@/features/pwa/service-worker-context", () => ({
  useServiceWorkerUpdate: () => useServiceWorkerUpdateMock(),
}));

describe("AppUpdateSetting", () => {
  it("shows the up-to-date state with a manual check action, no Update button", () => {
    useServiceWorkerUpdateMock.mockReturnValue({
      status: "up-to-date",
      checkForUpdate: vi.fn(),
      applyUpdate: vi.fn(),
    });
    render(<AppUpdateSetting />);

    expect(screen.getByText("MEDIO is up to date")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check for updates" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update now" })).not.toBeInTheDocument();
  });

  it("shows a retryable error state, still via the same check action", () => {
    useServiceWorkerUpdateMock.mockReturnValue({
      status: "error",
      checkForUpdate: vi.fn(),
      applyUpdate: vi.fn(),
    });
    render(<AppUpdateSetting />);

    expect(screen.getByText("Couldn't check for updates.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Check for updates" })).toBeInTheDocument();
  });

  it("shows a checking state with the check action disabled/loading, never an Update button", () => {
    useServiceWorkerUpdateMock.mockReturnValue({
      status: "checking",
      checkForUpdate: vi.fn(),
      applyUpdate: vi.fn(),
    });
    render(<AppUpdateSetting />);

    expect(screen.getByText("Checking for updates…")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Update now" })).not.toBeInTheDocument();
  });

  it("shows Update now, not Check for updates, once an update is genuinely available", async () => {
    const applyUpdate = vi.fn();
    useServiceWorkerUpdateMock.mockReturnValue({
      status: "available",
      checkForUpdate: vi.fn(),
      applyUpdate,
    });
    const user = userEvent.setup();
    render(<AppUpdateSetting />);

    expect(screen.getByText("Update available")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Check for updates" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Update now" }));
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });

  it("triggers a manual check when its action is pressed", async () => {
    const checkForUpdate = vi.fn();
    useServiceWorkerUpdateMock.mockReturnValue({
      status: "up-to-date",
      checkForUpdate,
      applyUpdate: vi.fn(),
    });
    const user = userEvent.setup();
    render(<AppUpdateSetting />);

    await user.click(screen.getByRole("button", { name: "Check for updates" }));
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
  });
});
