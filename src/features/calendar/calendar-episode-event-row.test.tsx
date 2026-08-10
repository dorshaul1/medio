import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { EpisodeReleaseEvent } from "@/server/calendar/types";
import { CalendarEpisodeEventRow } from "./calendar-episode-event-row";

vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: vi.fn(),
  unmarkEpisodeWatchedAction: vi.fn(),
}));

const NOW = new Date(Date.UTC(2026, 7, 17)); // Aug 17, 2026

function event(overrides: Partial<EpisodeReleaseEvent> = {}): EpisodeReleaseEvent {
  return {
    kind: "episode",
    date: "2026-08-17",
    relevance: "activeShow",
    hasAired: false,
    showProviderId: 1399,
    showTitle: "Winter's Watch",
    poster: null,
    backdrop: null,
    seasonNumber: 3,
    episodeNumber: 5,
    episodeProviderId: 900,
    episodeTitle: "The Reckoning",
    still: null,
    runtimeMinutes: 42,
    isSeasonPremiere: false,
    isShowPremiere: false,
    ...overrides,
  };
}

describe("CalendarEpisodeEventRow", () => {
  it("shows the show title and coordinate for an upcoming episode", () => {
    render(
      <ul>
        <CalendarEpisodeEventRow
          event={event()}
          now={NOW}
          useLocalTimezone
          spoilerProtection="off"
        />
      </ul>,
    );

    expect(screen.getByText("Winter's Watch")).toBeInTheDocument();
    expect(screen.getByText(/S3 E5/)).toBeInTheDocument();
  });

  it("labels a season premiere distinctly from a plain episode", () => {
    render(
      <ul>
        <CalendarEpisodeEventRow
          event={event({ episodeNumber: 1, isSeasonPremiere: true })}
          now={NOW}
          useLocalTimezone
          spoilerProtection="off"
        />
      </ul>,
    );

    expect(screen.getByText(/Season 3 premiere/)).toBeInTheDocument();
  });

  it("offers no quick-tracking control for a not-yet-aired episode", () => {
    render(
      <ul>
        <CalendarEpisodeEventRow
          event={event({ hasAired: false })}
          now={NOW}
          useLocalTimezone
          spoilerProtection="off"
        />
      </ul>,
    );

    expect(screen.queryByRole("button", { name: /Mark episode/ })).not.toBeInTheDocument();
  });

  it("offers a quick-tracking control for a new, aired, actively-tracked episode", () => {
    render(
      <ul>
        <CalendarEpisodeEventRow
          event={event({ hasAired: true, relevance: "activeShow" })}
          now={NOW}
          useLocalTimezone
          spoilerProtection="off"
        />
      </ul>,
    );

    expect(screen.getByRole("button", { name: /Mark episode 5 watched/ })).toBeInTheDocument();
    expect(screen.getByText(/New/)).toBeInTheDocument();
  });

  it("never offers a quick-tracking control for a planned (not yet tracked) show, even once aired", () => {
    render(
      <ul>
        <CalendarEpisodeEventRow
          event={event({ hasAired: true, relevance: "backlogShow" })}
          now={NOW}
          useLocalTimezone
          spoilerProtection="off"
        />
      </ul>,
    );

    expect(screen.queryByRole("button", { name: /Mark episode/ })).not.toBeInTheDocument();
  });

  it("hides the episode's real title behind Strict spoiler protection", () => {
    render(
      <ul>
        <CalendarEpisodeEventRow
          event={event()}
          now={NOW}
          useLocalTimezone
          spoilerProtection="strict"
        />
      </ul>,
    );

    // The show's own identity always stays visible — only the specific
    // episode's title/still are spoiler-sensitive.
    expect(screen.getByText("Winter's Watch")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show details for Winter's Watch episode 5" }),
    ).toBeInTheDocument();
  });

  it("reveals the episode after clicking 'Show details', without changing the global preference", async () => {
    const user = userEvent.setup();
    render(
      <ul>
        <CalendarEpisodeEventRow
          event={event()}
          now={NOW}
          useLocalTimezone
          spoilerProtection="strict"
        />
      </ul>,
    );

    await user.click(
      screen.getByRole("button", { name: "Show details for Winter's Watch episode 5" }),
    );

    expect(
      screen.queryByRole("button", { name: "Show details for Winter's Watch episode 5" }),
    ).not.toBeInTheDocument();
  });

  it("never hides anything when Spoiler protection is off", () => {
    render(
      <ul>
        <CalendarEpisodeEventRow
          event={event()}
          now={NOW}
          useLocalTimezone
          spoilerProtection="off"
        />
      </ul>,
    );

    expect(screen.queryByRole("button", { name: /Show details/ })).not.toBeInTheDocument();
  });
});
