import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PersonFilmographyFilter } from "./person-filmography-filter";

describe("PersonFilmographyFilter", () => {
  it("renders All plus only the roles the person actually has credits in", () => {
    render(<PersonFilmographyFilter personId={525} roles={["directing", "acting"]} active="all" />);

    expect(screen.getByRole("link", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Directing" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acting" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Writing" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Producing" })).not.toBeInTheDocument();
  });

  it("links each option to the person's own page with the right ?credit= value", () => {
    render(<PersonFilmographyFilter personId={525} roles={["directing"]} active="all" />);

    expect(screen.getByRole("link", { name: "All" })).toHaveAttribute("href", "/people/525");
    expect(screen.getByRole("link", { name: "Directing" })).toHaveAttribute(
      "href",
      "/people/525?credit=directing",
    );
  });

  it("marks the active option with aria-current", () => {
    render(<PersonFilmographyFilter personId={525} roles={["directing"]} active="directing" />);

    expect(screen.getByRole("link", { name: "Directing" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "All" })).not.toHaveAttribute("aria-current");
  });
});
