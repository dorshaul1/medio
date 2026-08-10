import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it("toggles checked state when activated", async () => {
    const user = userEvent.setup();
    render(<Switch aria-label="Notifications" />);

    const toggle = screen.getByRole("switch", { name: "Notifications" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("is not interactive when disabled", () => {
    render(<Switch aria-label="Notifications" disabled />);

    expect(screen.getByRole("switch", { name: "Notifications" })).toBeDisabled();
  });
});
