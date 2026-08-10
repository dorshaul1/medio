import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsHero } from "./stats-hero";

const OVERVIEW = {
  uniqueMoviesWatched: 12,
  movieWatchEventCount: 14,
  uniqueEpisodesWatched: 340,
  episodeWatchEventCount: 355,
  uniqueShowsWatched: 6,
  watchedThisYearCount: 9,
};

describe("StatsHero", () => {
  it("renders one grounded headline sentence, not fabricated copy", () => {
    render(
      <StatsHero
        headline={{ kind: "highest_rated_genre", genre: "Drama" }}
        overview={OVERVIEW}
        estimatedViewingTime={null}
      />,
    );
    expect(screen.getByText("Drama is your highest-rated genre.")).toBeInTheDocument();
  });

  it("renders one restrained supporting line of counts, not four KPI cards", () => {
    render(
      <StatsHero headline={{ kind: "sparse" }} overview={OVERVIEW} estimatedViewingTime={null} />,
    );
    expect(screen.getByText(/12 movies/)).toBeInTheDocument();
    expect(screen.getByText(/6 shows/)).toBeInTheDocument();
    expect(screen.getByText(/340 episodes/)).toBeInTheDocument();
    expect(screen.getAllByText(/movies|shows|episodes/).length).toBeGreaterThan(0);
  });

  it("appends a rounded, honestly-approximate viewing-time figure only when confident enough", () => {
    render(
      <StatsHero
        headline={{ kind: "sparse" }}
        overview={OVERVIEW}
        estimatedViewingTime={{ minutes: 38472, coverageRatio: 0.9 }}
      />,
    );
    expect(screen.getByText(/~641 hours watched/)).toBeInTheDocument();
    expect(screen.queryByText(/38,472 minutes/)).not.toBeInTheDocument();
  });

  it("omits the viewing-time figure entirely when confidence is too low", () => {
    render(
      <StatsHero headline={{ kind: "sparse" }} overview={OVERVIEW} estimatedViewingTime={null} />,
    );
    expect(screen.queryByText(/hours watched/)).not.toBeInTheDocument();
  });
});
