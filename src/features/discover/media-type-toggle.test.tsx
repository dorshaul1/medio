import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MediaTypeToggle } from "./media-type-toggle";

describe("MediaTypeToggle", () => {
  it("marks Movies active via aria-current, and only Movies, when active='movies'", () => {
    render(<MediaTypeToggle active="movies" />);

    expect(screen.getByRole("link", { name: "Movies" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Shows" })).not.toHaveAttribute("aria-current");
  });

  it("marks Shows active via aria-current when active='shows'", () => {
    render(<MediaTypeToggle active="shows" />);

    expect(screen.getByRole("link", { name: "Shows" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Movies" })).not.toHaveAttribute("aria-current");
  });

  it("links to real, distinct URLs for each mode", () => {
    render(<MediaTypeToggle active="movies" />);

    expect(screen.getByRole("link", { name: "Movies" })).toHaveAttribute("href", "/discover");
    expect(screen.getByRole("link", { name: "Shows" })).toHaveAttribute(
      "href",
      "/discover?type=shows",
    );
  });
});
