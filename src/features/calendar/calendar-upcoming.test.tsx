import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EpisodeReleaseEvent, MovieReleaseEvent } from "@/server/calendar/types";
import { CalendarUpcoming } from "./calendar-upcoming";

vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: vi.fn(),
  unmarkEpisodeWatchedAction: vi.fn(),
}));

// `CalendarUpcoming` reads the real wall clock internally (same
// precedent as `DiaryTimeline` — see its own comment), so tests that
// care about a specific bucket (Today/Tomorrow/This week) compute event
// dates relative to the actual current date rather than a hardcoded
// literal, the same way `diary-timeline.test.tsx` avoids asserting
// exact "Today" labels against a fixed date.
function isoOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function episode(overrides: Partial<EpisodeReleaseEvent> = {}): EpisodeReleaseEvent {
  return {
    kind: "episode",
    date: isoOffset(0),
    relevance: "activeShow",
    hasAired: false,
    showProviderId: 1,
    showTitle: "Show One",
    poster: null,
    backdrop: null,
    seasonNumber: 1,
    episodeNumber: 1,
    episodeProviderId: 1,
    episodeTitle: "Episode",
    still: null,
    runtimeMinutes: 42,
    isSeasonPremiere: false,
    isShowPremiere: false,
    ...overrides,
  };
}

function movie(overrides: Partial<MovieReleaseEvent> = {}): MovieReleaseEvent {
  return {
    kind: "movieRelease",
    date: isoOffset(0),
    relevance: "backlogMovie",
    hasAired: false,
    movieProviderId: 5,
    movieTitle: "A Movie",
    poster: null,
    backdrop: null,
    ...overrides,
  };
}

describe("CalendarUpcoming", () => {
  it("shows an empty state when there are no events at all", () => {
    render(<CalendarUpcoming events={[]} filter="all" spoilerProtection="off" />);
    expect(screen.getByText("Nothing on your calendar yet.")).toBeInTheDocument();
  });

  it("shows a filter-specific empty state when filtered to nothing", () => {
    render(<CalendarUpcoming events={[]} filter="movies" spoilerProtection="off" />);
    expect(screen.getByText(/No upcoming movies right now\./)).toBeInTheDocument();
  });

  it("never renders a heading for a section with no events", () => {
    render(
      <CalendarUpcoming
        events={[episode({ date: isoOffset(1) })]} // tomorrow only
        filter="all"
        spoilerProtection="off"
      />,
    );

    expect(screen.getByRole("heading", { name: "Tomorrow" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Today" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "This week" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Recently released" })).not.toBeInTheDocument();
  });

  it("renders both an episode event and a movie event in one agenda", () => {
    render(
      <CalendarUpcoming
        events={[episode({ date: isoOffset(1) }), movie({ date: isoOffset(1) })]}
        filter="all"
        spoilerProtection="off"
      />,
    );

    expect(screen.getByText("Show One")).toBeInTheDocument();
    expect(screen.getByText("A Movie")).toBeInTheDocument();
  });
});
