import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserIdentityLink } from "./user-identity-link";

const usePathname = vi.fn();
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

describe("UserIdentityLink", () => {
  it("links directly to Settings → Account, no dropdown", () => {
    usePathname.mockReturnValue("/library");
    render(<UserIdentityLink name="Dor Shaul" email="dor@example.com" image={null} />);

    const link = screen.getByRole("link", { name: "Open account settings for Dor Shaul" });
    expect(link).toHaveAttribute("href", "/settings/account");
  });

  it("shows the visible name on the desktop variant", () => {
    usePathname.mockReturnValue("/library");
    render(<UserIdentityLink name="Dor Shaul" email="dor@example.com" image={null} />);
    expect(screen.getByText("Dor Shaul")).toBeInTheDocument();
  });

  it("shows no visible name on the mobile variant — avatar only, still a precise accessible name", () => {
    usePathname.mockReturnValue("/library");
    render(
      <UserIdentityLink name="Dor Shaul" email="dor@example.com" image={null} variant="mobile" />,
    );
    expect(screen.queryByText("Dor Shaul")).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open account settings for Dor Shaul" }),
    ).toBeInTheDocument();
  });

  it("falls back to email for both the visible label and the accessible name when no name is set", () => {
    usePathname.mockReturnValue("/library");
    render(<UserIdentityLink name="" email="dor@example.com" image={null} />);
    expect(screen.getByText("dor@example.com")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open account settings for dor@example.com" }),
    ).toBeInTheDocument();
  });

  it("marks itself current while anywhere under /settings", () => {
    usePathname.mockReturnValue("/settings/appearance");
    render(<UserIdentityLink name="Dor Shaul" email="dor@example.com" image={null} />);
    expect(screen.getByRole("link", { name: /Open account settings/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("is not current elsewhere in the app", () => {
    usePathname.mockReturnValue("/library");
    render(<UserIdentityLink name="Dor Shaul" email="dor@example.com" image={null} />);
    expect(screen.getByRole("link", { name: /Open account settings/ })).not.toHaveAttribute(
      "aria-current",
    );
  });
});
