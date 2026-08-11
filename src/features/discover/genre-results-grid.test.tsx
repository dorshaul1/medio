import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MediaSummary } from "@/server/media/types";
import { GenreResultsGrid } from "./genre-results-grid";

const MOVIE: MediaSummary = {
  mediaType: "movie",
  id: 550,
  title: "Fight Club",
  originalTitle: "Fight Club",
  overview: null,
  releaseDate: "1999-10-15",
  releaseYear: 1999,
  poster: null,
  backdrop: null,
  providerRating: 8.4,
  voteCount: 26000,
  genreIds: [],
  adult: false,
};

describe("GenreResultsGrid", () => {
  it("shows a precise empty message when there are no results", () => {
    render(<GenreResultsGrid items={[]} emptyLabel="drama movies" />);
    expect(screen.getByText("No drama movies found.")).toBeInTheDocument();
  });

  it("shows a quiet Watched mark for a tile the user already watched", () => {
    render(
      <GenreResultsGrid
        items={[MOVIE]}
        emptyLabel="drama movies"
        personalStates={new Map([["movie:550", { kind: "watched", rating: null }]])}
      />,
    );
    expect(screen.getByRole("link", { name: "Fight Club, watched" })).toBeInTheDocument();
  });
});
