import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatsHero } from "./stats-hero";

const OVERVIEW = {
  uniqueMoviesWatched: 12,
  movieWatchEventCount: 14,
  uniqueEpisodesWatched: 340,
  episodeWatchEventCount: 355,
  uniqueShowsWatched: 6,
};

describe("StatsHero", () => {
  it("renders an all-time viewing headline", () => {
    render(<StatsHero range={{ kind: "all" }} overview={OVERVIEW} estimatedViewingTime={null} />);
    expect(screen.getByText("Your viewing history.")).toBeInTheDocument();
  });

  it("renders a range-specific headline for a selected year", () => {
    render(
      <StatsHero
        range={{ kind: "year", year: 2025 }}
        overview={OVERVIEW}
        estimatedViewingTime={null}
      />,
    );
    expect(screen.getByText("What you watched in 2025.")).toBeInTheDocument();
  });

  it("renders large unique-count numbers, not KPI cards", () => {
    render(<StatsHero range={{ kind: "all" }} overview={OVERVIEW} estimatedViewingTime={null} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Movies")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Shows")).toBeInTheDocument();
    expect(screen.getByText("340")).toBeInTheDocument();
    expect(screen.getByText("Episodes")).toBeInTheDocument();
  });

  it("distinguishes unique counts from viewing events and rewatches", () => {
    render(<StatsHero range={{ kind: "all" }} overview={OVERVIEW} estimatedViewingTime={null} />);
    // 14 + 355 = 369 total events; 369 - 12 - 340 = 17 rewatch events.
    expect(screen.getByText(/369 viewing events, including 17 rewatches/)).toBeInTheDocument();
  });

  it("omits the rewatch line entirely when nothing was rewatched", () => {
    render(
      <StatsHero
        range={{ kind: "all" }}
        overview={{
          uniqueMoviesWatched: 3,
          movieWatchEventCount: 3,
          uniqueEpisodesWatched: 10,
          episodeWatchEventCount: 10,
          uniqueShowsWatched: 1,
        }}
        estimatedViewingTime={null}
      />,
    );
    expect(screen.queryByText(/rewatch/)).not.toBeInTheDocument();
  });

  it("appends a rounded viewing-time figure only when confident enough", () => {
    render(
      <StatsHero
        range={{ kind: "all" }}
        overview={OVERVIEW}
        estimatedViewingTime={{ minutes: 38472, coverageRatio: 0.9 }}
      />,
    );
    expect(screen.getByText(/~641 hours watched/)).toBeInTheDocument();
    expect(screen.queryByText(/38,472 minutes/)).not.toBeInTheDocument();
  });
});
