import { render, screen } from "@testing-library/react";
import { Settings } from "lucide-react";
import { describe, expect, it } from "vitest";
import { IconButton } from "./icon-button";

describe("IconButton", () => {
  it("exposes the required aria-label as its accessible name", () => {
    render(
      <IconButton aria-label="Settings">
        <Settings />
      </IconButton>,
    );

    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });
});
