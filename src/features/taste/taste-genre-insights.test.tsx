import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GenreInsights } from "@/server/stats/types";
import { TasteGenreSection } from "./taste-genre-insights";

describe("TasteGenreSection", () => {
  it("renders nothing when there is no genre evidence at all", () => {
    const { container } = render(<TasteGenreSection genres={{ mostWatched: [] }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders most-watched genres as a semantically readable list, not just a bar", () => {
    const genres: GenreInsights = {
      mostWatched: [{ genreId: 1, genreName: "Drama", titleCount: 8 }],
    };
    render(<TasteGenreSection genres={genres} />);

    expect(screen.getByRole("region", { name: /Genres/ })).toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
    expect(screen.getByText("8 titles")).toBeInTheDocument();
  });

  it("ranks multiple genres highest title count first", () => {
    const genres: GenreInsights = {
      mostWatched: [
        { genreId: 1, genreName: "Drama", titleCount: 8 },
        { genreId: 2, genreName: "Comedy", titleCount: 3 },
      ],
    };
    render(<TasteGenreSection genres={genres} />);

    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Drama");
    expect(items[1]).toHaveTextContent("Comedy");
  });
});
