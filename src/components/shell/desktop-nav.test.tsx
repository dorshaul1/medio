import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DesktopNav } from "./desktop-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/discover",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// GlobalSearch's own entry point needs GlobalSearchProvider's context —
// a separate, already-tested concern (see features/search/) unrelated to
// what this file verifies about DesktopNav itself.
vi.mock("@/features/search/global-search-trigger", () => ({
  GlobalSearchNavTrigger: () => null,
}));

const USER = { name: "Ada Lovelace", email: "ada@example.com", image: null };

function renderNav() {
  return render(<DesktopNav user={USER} />);
}

describe("DesktopNav", () => {
  it("renders every primary destination with an accessible name", () => {
    renderNav();

    for (const label of ["Home", "Discover", "Library", "Stats"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("exposes the current route via aria-current and no other route", () => {
    renderNav();

    expect(screen.getByRole("link", { name: "Discover" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("integrates the account identity link as a direct link to Settings → Account", () => {
    renderNav();

    const identityLink = screen.getByRole("link", {
      name: `Open account settings for ${USER.name}`,
    });
    expect(identityLink).toHaveAttribute("href", "/settings/account");
    expect(screen.getByText(USER.name)).toBeInTheDocument();
  });
});
