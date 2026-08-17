import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TasteHero } from "./taste-hero";

describe("TasteHero", () => {
  it("shows a restrained sparse-state message without count clutter", () => {
    render(
      <TasteHero
        headline={{ kind: "sparse" }}
        overview={{
          uniqueMoviesWatched: 0,
          movieWatchEventCount: 0,
          uniqueEpisodesWatched: 0,
          episodeWatchEventCount: 0,
          uniqueShowsWatched: 0,
        }}
        estimatedViewingTime={null}
      />,
    );

    expect(screen.getByText(/take shape as you watch more/)).toBeInTheDocument();
    expect(screen.queryByText(/movies/)).not.toBeInTheDocument();
  });

  it("shows a genre headline with supporting counts", () => {
    render(
      <TasteHero
        headline={{ kind: "most_watched_genre", genre: "Drama" }}
        overview={{
          uniqueMoviesWatched: 12,
          movieWatchEventCount: 15,
          uniqueEpisodesWatched: 40,
          episodeWatchEventCount: 42,
          uniqueShowsWatched: 3,
        }}
        estimatedViewingTime={null}
      />,
    );

    expect(screen.getByText("You watch mostly Drama.")).toBeInTheDocument();
    expect(screen.getByText(/12 movies/)).toBeInTheDocument();
    expect(screen.getByText(/3 shows/)).toBeInTheDocument();
  });
});
