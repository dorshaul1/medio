import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MediaSummary } from "@/server/media/types";
import { MediaPoster } from "./media-poster";

const MOVIE: MediaSummary = {
  mediaType: "movie",
  id: 550,
  title: "Fight Club",
  originalTitle: "Fight Club",
  overview: "A man...",
  releaseDate: "1999-10-15",
  releaseYear: 1999,
  poster: { path: "/poster.jpg" },
  backdrop: null,
  providerRating: 8.4,
  voteCount: 26000,
  genreIds: [18],
  adult: false,
};

describe("MediaPoster", () => {
  it("links to the canonical movie route with an accessible name from its own text", () => {
    render(<MediaPoster media={MOVIE} />);

    const link = screen.getByRole("link", { name: "Fight Club 1999" });
    expect(link).toHaveAttribute("href", "/movies/550");
  });

  it("links to the canonical show route for a show", () => {
    render(<MediaPoster media={{ ...MOVIE, mediaType: "show", id: 1399, title: "A Show" }} />);

    expect(screen.getByRole("link", { name: "A Show 1999" })).toHaveAttribute(
      "href",
      "/shows/1399",
    );
  });

  it("uses an empty alt on the poster image — the link text already names the media", () => {
    render(<MediaPoster media={MOVIE} />);

    // An empty alt is correctly presentational, not role "img" — that's
    // the point of this test: the image is removed from the accessible
    // tree so the link's name (asserted above) isn't duplicated by it.
    expect(screen.getByRole("presentation")).toHaveAttribute("alt", "");
  });

  it("renders a type-appropriate fallback instead of an image when there's no poster", () => {
    render(<MediaPoster media={{ ...MOVIE, poster: null }} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("omits the year entirely when unknown, rather than a placeholder string", () => {
    render(<MediaPoster media={{ ...MOVIE, releaseYear: null }} />);

    expect(screen.getByRole("link", { name: "Fight Club" })).toBeInTheDocument();
  });

  it("renders no watched indication by default", () => {
    render(<MediaPoster media={MOVIE} />);
    expect(screen.getByRole("link", { name: "Fight Club 1999" })).toBeInTheDocument();
  });

  it("marks a watched title for assistive tech, not just a visual corner mark", () => {
    render(<MediaPoster media={MOVIE} watched />);
    expect(screen.getByRole("link", { name: "Fight Club, watched" })).toBeInTheDocument();
  });
});
