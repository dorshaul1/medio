import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MobileNav } from "./mobile-nav";

vi.mock("next/navigation", () => ({
  usePathname: () => "/library",
}));

describe("MobileNav", () => {
  it("renders every primary destination with an accessible name", () => {
    render(<MobileNav />);

    for (const label of ["Home", "Discover", "Library", "Stats"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("exposes the current route via aria-current and no other route", () => {
    render(<MobileNav />);

    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });
});
