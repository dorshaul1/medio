import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchResultTypeFilter } from "./search-result-type-filter";

describe("SearchResultTypeFilter", () => {
  it("marks the active filter with aria-current", () => {
    render(<SearchResultTypeFilter query="dune" active="movies" />);

    expect(screen.getByRole("link", { name: "Movies" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current");
  });

  it("links to plain ?q= for All — no ?resultType= param", () => {
    render(<SearchResultTypeFilter query="dune" active="all" />);
    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/discover?q=dune");
  });

  it("carries the query into each type-specific link", () => {
    render(<SearchResultTypeFilter query="dune" active="all" />);
    expect(screen.getByRole("link", { name: "Shows" })).toHaveAttribute(
      "href",
      "/discover?q=dune&resultType=shows",
    );
  });
});
