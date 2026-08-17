import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LogoutControl } from "./logout-control";

const signOut = vi.fn();
vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: (...args: unknown[]) => signOut(...args) },
}));

const clearRecentSearches = vi.fn();
vi.mock("@/features/search/recent-searches", () => ({
  clearRecentSearches: () => clearRecentSearches(),
}));

// jsdom's real `window.location` throws "Not implemented: navigation" on
// assignment — replaced with a plain writable stub so the hard
// navigation (see logout-control.tsx for why it's a hard reload, not
// `router.push`) is observable without jsdom noise.
const originalLocation = window.location;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "location", {
    value: { ...originalLocation, href: "/settings/account" },
    writable: true,
    configurable: true,
  });
});

describe("LogoutControl", () => {
  it("hard-navigates to the public Landing page once sign-out succeeds", async () => {
    const user = userEvent.setup();
    signOut.mockImplementation(({ fetchOptions }) => {
      fetchOptions.onSuccess();
      return Promise.resolve();
    });

    render(<LogoutControl />);
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(signOut).toHaveBeenCalledWith(
      expect.objectContaining({
        fetchOptions: expect.objectContaining({ onSuccess: expect.any(Function) }),
      }),
    );
    expect(window.location.href).toBe("/");
  });

  it("never navigates anywhere if sign-out never succeeds (no dead-looking button)", async () => {
    const user = userEvent.setup();
    signOut.mockReturnValue(new Promise(() => {})); // never resolves

    render(<LogoutControl />);
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(signOut).toHaveBeenCalled();
    expect(window.location.href).toBe("/settings/account");
  });

  it("clears locally-stored Recent Searches once sign-out succeeds", async () => {
    const user = userEvent.setup();
    signOut.mockImplementation(({ fetchOptions }) => {
      fetchOptions.onSuccess();
      return Promise.resolve();
    });

    render(<LogoutControl />);
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(clearRecentSearches).toHaveBeenCalled();
  });

  it("never clears Recent Searches if sign-out never succeeds", async () => {
    const user = userEvent.setup();
    signOut.mockReturnValue(new Promise(() => {})); // never resolves

    render(<LogoutControl />);
    await user.click(screen.getByRole("button", { name: "Log out" }));

    expect(clearRecentSearches).not.toHaveBeenCalled();
  });
});
