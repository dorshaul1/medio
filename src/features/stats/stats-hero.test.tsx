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

  it("renders no Time watched section at all when the estimate isn't confident enough", () => {
    render(<StatsHero range={{ kind: "all" }} overview={OVERVIEW} estimatedViewingTime={null} />);
    expect(screen.queryByText("Time watched")).not.toBeInTheDocument();
  });

  it("renders an hours+minutes Total once confident enough, with no raw minutes shown", () => {
    render(
      <StatsHero
        range={{ kind: "all" }}
        overview={OVERVIEW}
        estimatedViewingTime={{
          minutes: 38472,
          coverageRatio: 0.9,
          movieMinutes: null,
          showMinutes: null,
        }}
      />,
    );
    expect(screen.getByText("Time watched")).toBeInTheDocument();
    // 38472 minutes = 641h 12m.
    expect(screen.getByText("~641h 12m")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.queryByText(/38,472/)).not.toBeInTheDocument();
    // Movies/Shows weren't individually confident enough — only one
    // Time-watched figure (Total) shows, never an invented per-type one.
    expect(screen.getAllByText(/^~/)).toHaveLength(1);
  });

  it("shows the Movies/Shows breakdown once each independently clears the confidence bar", () => {
    render(
      <StatsHero
        range={{ kind: "all" }}
        overview={OVERVIEW}
        estimatedViewingTime={{
          minutes: 900,
          coverageRatio: 0.9,
          movieMinutes: 630,
          showMinutes: 270,
        }}
      />,
    );
    // 630min = 10h 30m, 270min = 4h 30m, 900min = 15h.
    expect(screen.getByText("~10h 30m")).toBeInTheDocument();
    expect(screen.getByText("~4h 30m")).toBeInTheDocument();
    expect(screen.getByText("~15h")).toBeInTheDocument();
  });

  it("shows plain minutes, no hour segment, for a duration under an hour", () => {
    render(
      <StatsHero
        range={{ kind: "all" }}
        overview={OVERVIEW}
        estimatedViewingTime={{
          minutes: 45,
          coverageRatio: 0.9,
          movieMinutes: null,
          showMinutes: null,
        }}
      />,
    );
    expect(screen.getByText("~45m")).toBeInTheDocument();
  });
});
