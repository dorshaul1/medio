import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountControl } from "./account-control";

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
}));

const signOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: (...args: unknown[]) => signOut(...args) },
}));

// jsdom's real `window.location` throws "Not implemented: navigation" on
// assignment — replaced with a plain writable stub so `handleSignOut`'s
// hard navigation (see account-control.tsx for why it's a hard reload,
// not `router.push`) is observable without jsdom noise.
const originalLocation = window.location;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, href: "/library" },
    writable: true,
    configurable: true,
  });
});

describe("AccountControl", () => {
  it("shows the user's name and a Sign out control", () => {
    render(<AccountControl name="Dor" email="dor@example.com" />);
    expect(screen.getByText("Dor")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("falls back to email when no name is set", () => {
    render(<AccountControl name="" email="dor@example.com" />);
    expect(screen.getByText("dor@example.com")).toBeInTheDocument();
  });

  it("hard-navigates to the public Landing page (never back to Sign In) once sign-out succeeds — even from '/' itself", async () => {
    const user = userEvent.setup();
    signOut.mockImplementation(({ fetchOptions }) => {
      fetchOptions.onSuccess();
      return Promise.resolve();
    });

    render(<AccountControl name="Dor" email="dor@example.com" />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchOptions: expect.objectContaining({ onSuccess: expect.any(Function) }),
      }),
    );
    // A hard reload, not a soft client-side push — the fix for the real
    // bug where being already on "/" made `router.push("/")` a no-op and
    // left the stale authenticated shell on screen.
    expect(window.location.href).toBe("/");
  });

  it("never navigates anywhere if sign-out never succeeds (no dead-looking button)", async () => {
    const user = userEvent.setup();
    signOut.mockReturnValue(new Promise(() => {})); // never resolves

    render(<AccountControl name="Dor" email="dor@example.com" />);
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOut).toHaveBeenCalled();
    expect(window.location.href).toBe("/library");
  });
});
