import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LibraryTypeToggle } from "./library-type-toggle";

describe("LibraryTypeToggle", () => {
  it("marks the active destination with aria-current", () => {
    render(<LibraryTypeToggle active="movie" state={undefined} sort={undefined} />);
    expect(screen.getByRole("link", { name: "Movies" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current");
  });

  it("links to plain /library for All", () => {
    render(<LibraryTypeToggle active="all" state={undefined} sort={undefined} />);
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/library");
  });

  it("carries a state filter over to a type where it's still meaningful", () => {
    render(<LibraryTypeToggle active="show" state="watchlist" sort={undefined} />);
    expect(screen.getByRole("link", { name: "Shows" })).toHaveAttribute(
      "href",
      "/library?type=show&state=watchlist",
    );
  });

  it("carries sort over to every type", () => {
    render(<LibraryTypeToggle active="all" state={undefined} sort="added" />);
    expect(screen.getByRole("link", { name: "Movies" })).toHaveAttribute(
      "href",
      "/library?type=movie&sort=added",
    );
  });
});
