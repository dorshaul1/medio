import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LandingThemeToggle } from "./landing-theme-toggle";

const setTheme = vi.fn();
let resolvedTheme = "light";
vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme, setTheme }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  resolvedTheme = "light";
});

describe("LandingThemeToggle", () => {
  it("switches to dark from light", async () => {
    const user = userEvent.setup();
    render(<LandingThemeToggle />);

    await user.click(await screen.findByRole("button", { name: "Switch to dark theme" }));
    expect(setTheme).toHaveBeenCalledWith("dark");
  });

  it("switches to light from dark", async () => {
    resolvedTheme = "dark";
    const user = userEvent.setup();
    render(<LandingThemeToggle />);

    await user.click(await screen.findByRole("button", { name: "Switch to light theme" }));
    expect(setTheme).toHaveBeenCalledWith("light");
  });
});
