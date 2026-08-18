import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PwaManager } from "./pwa-manager";

const useServiceWorkerUpdateMock = vi.fn();
vi.mock("@/features/pwa/service-worker-context", () => ({
  useServiceWorkerUpdate: () => useServiceWorkerUpdateMock(),
}));

describe("PwaManager", () => {
  it("renders nothing when no update is waiting", () => {
    useServiceWorkerUpdateMock.mockReturnValue({
      status: "up-to-date",
      applyUpdate: vi.fn(),
    });
    const { container } = render(<PwaManager />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while merely checking — never a premature prompt", () => {
    useServiceWorkerUpdateMock.mockReturnValue({ status: "checking", applyUpdate: vi.fn() });
    const { container } = render(<PwaManager />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the update toast once a version is genuinely waiting, and applies it on click", async () => {
    const applyUpdate = vi.fn();
    useServiceWorkerUpdateMock.mockReturnValue({ status: "available", applyUpdate });
    const user = userEvent.setup();
    render(<PwaManager />);

    expect(screen.getByText("A new version of MEDIO is ready.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Refresh" }));
    expect(applyUpdate).toHaveBeenCalledTimes(1);
  });
});
