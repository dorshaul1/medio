import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Checkbox } from "./checkbox";

describe("Checkbox", () => {
  it("toggles checked state when activated", async () => {
    const user = userEvent.setup();
    render(<Checkbox aria-label="Select all" />);

    const checkbox = screen.getByRole("checkbox", { name: "Select all" });
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    await user.click(checkbox);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("supports an indeterminate initial state", () => {
    render(<Checkbox aria-label="Select all" defaultChecked="indeterminate" />);

    expect(screen.getByRole("checkbox", { name: "Select all" })).toHaveAttribute(
      "aria-checked",
      "mixed",
    );
  });
});
