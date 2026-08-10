import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MediaSummary } from "@/server/media/types";
import { SearchResultRow } from "./search-result-row";

const SHOW: MediaSummary = {
  mediaType: "show",
  id: 1399,
  title: "Game of Thrones",
  originalTitle: "Game of Thrones",
  overview: "Seven noble families fight.",
  releaseDate: "2011-04-17",
  releaseYear: 2011,
  poster: { path: "/got.jpg" },
  backdrop: null,
  providerRating: 8.4,
  voteCount: 21000,
  genreIds: [18],
  adult: false,
};

describe("SearchResultRow", () => {
  it("links to the canonical show route", () => {
    render(<SearchResultRow media={SHOW} />);

    expect(screen.getByRole("link", { name: "Game of Thrones 2011" })).toHaveAttribute(
      "href",
      "/shows/1399",
    );
  });

  it("links to the canonical movie route for a movie result", () => {
    render(
      <SearchResultRow
        media={{ ...SHOW, mediaType: "movie", id: 550, title: "Fight Club", releaseYear: 1999 }}
      />,
    );

    expect(screen.getByRole("link", { name: "Fight Club 1999" })).toHaveAttribute(
      "href",
      "/movies/550",
    );
  });

  it("falls back to a type-appropriate placeholder when there's no poster", () => {
    render(<SearchResultRow media={{ ...SHOW, poster: null }} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
