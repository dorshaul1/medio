import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GenreInsights } from "@/server/stats/types";
import { TasteGenreSection } from "./taste-genre-insights";

describe("TasteGenreSection", () => {
  it("renders nothing when there is no genre evidence at all", () => {
    const { container } = render(
      <TasteGenreSection genres={{ mostWatched: [], highestRated: [] }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders most-watched genres as a semantically readable list, not just a bar", () => {
    const genres: GenreInsights = {
      mostWatched: [{ genreId: 1, genreName: "Drama", titleCount: 8 }],
      highestRated: [],
    };
    render(<TasteGenreSection genres={genres} />);

    expect(screen.getByRole("region", { name: "Genres" })).toBeInTheDocument();
    expect(screen.getByText("Drama")).toBeInTheDocument();
    expect(screen.getByText("8 titles")).toBeInTheDocument();
  });

  it("renders both most-watched and highest-rated lists independently", () => {
    const genres: GenreInsights = {
      mostWatched: [{ genreId: 1, genreName: "Drama", titleCount: 8 }],
      highestRated: [{ genreId: 2, genreName: "Sci-Fi", averageRating: 4.8, ratedTitleCount: 3 }],
    };
    render(<TasteGenreSection genres={genres} />);

    expect(screen.getByText("You watch the most")).toBeInTheDocument();
    expect(screen.getByText("You rate the highest")).toBeInTheDocument();
    expect(screen.getByText("4.8 avg")).toBeInTheDocument();
  });

  it("renders only the developing side when no rating signal exists yet", () => {
    const genres: GenreInsights = {
      mostWatched: [{ genreId: 1, genreName: "Comedy", titleCount: 3 }],
      highestRated: [],
    };
    render(<TasteGenreSection genres={genres} />);

    expect(screen.getByText("You watch the most")).toBeInTheDocument();
    expect(screen.queryByText("You rate the highest")).not.toBeInTheDocument();
  });
});
