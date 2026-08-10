import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicNav } from "./public-nav";

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "light", setTheme: vi.fn() }),
}));

describe("PublicNav", () => {
  it("shows the MEDIO brand mark linking home, and Log in / Get started", () => {
    render(<PublicNav />);

    expect(screen.getByRole("link", { name: "MEDIO home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/sign-in");
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/sign-up");
  });

  it("never recreates the authenticated primary navigation", () => {
    render(<PublicNav />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    for (const label of ["Home", "Discover", "Library", "Stats"]) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });
});
