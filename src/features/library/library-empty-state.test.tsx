import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LibraryEmptyState } from "./library-empty-state";

describe("LibraryEmptyState", () => {
  it("renders the heading and description", () => {
    render(
      <LibraryEmptyState heading="Nothing here yet." description="No media matches this filter." />,
    );
    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(screen.getByText(/No media matches this filter/)).toBeInTheDocument();
  });

  it("offers a Discover link only when asked", () => {
    const { rerender } = render(
      <LibraryEmptyState
        heading="Nothing here yet."
        description="Save something."
        showDiscoverLink
      />,
    );
    expect(screen.getByRole("link", { name: "Browse Discover" })).toHaveAttribute(
      "href",
      "/discover",
    );

    rerender(
      <LibraryEmptyState heading="Nothing here yet." description="No media matches this filter." />,
    );
    expect(screen.queryByRole("link", { name: "Browse Discover" })).not.toBeInTheDocument();
  });
});
