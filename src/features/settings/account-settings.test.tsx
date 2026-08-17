import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AccountSettings } from "./account-settings";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { updateUser: vi.fn(), changePassword: vi.fn(), signOut: vi.fn() },
}));
vi.mock("@/features/search/recent-searches", () => ({ clearRecentSearches: vi.fn() }));

const USER = { name: "Dor Shaul", email: "dor@example.com", image: null };

describe("AccountSettings", () => {
  it("shows the authenticated user's identity", () => {
    render(<AccountSettings user={USER} />);
    expect(screen.getByLabelText("Display name")).toHaveValue("Dor Shaul");
    expect(screen.getByText("dor@example.com")).toBeInTheDocument();
    expect(screen.getByText("DS")).toBeInTheDocument();
  });

  it("email has no editable control — read-only text, not a disabled input", () => {
    render(<AccountSettings user={USER} />);
    expect(screen.queryByLabelText(/email/i)).not.toBeInTheDocument();
  });

  it("offers Change password and Log out as real controls", () => {
    render(<AccountSettings user={USER} />);
    expect(screen.getByRole("button", { name: "Change password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log out" })).toBeInTheDocument();
  });

  it("never introduces social-profile fields", () => {
    render(<AccountSettings user={USER} />);
    for (const field of [/bio/i, /username/i, /location/i, /website/i]) {
      expect(screen.queryByLabelText(field)).not.toBeInTheDocument();
    }
  });
});
