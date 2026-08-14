import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { EpisodeReleaseEvent } from "@/server/calendar/types";
import { HomeCalendarAgendaView } from "./home-calendar-agenda-view";

vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: vi.fn(),
  unmarkEpisodeWatchedAction: vi.fn(),
}));

// Reads the real wall clock internally (same precedent as
// `CalendarUpcoming` — see its own test file), so bucket-sensitive
// assertions compute event dates relative to "now" rather than a
// hardcoded literal.
function isoOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function episode(
  showProviderId: number,
  overrides: Partial<EpisodeReleaseEvent> = {},
): EpisodeReleaseEvent {
  return {
    kind: "episode",
    date: isoOffset(0),
    relevance: "activeShow",
    hasAired: false,
    showProviderId,
    showTitle: `Show ${showProviderId}`,
    poster: null,
    backdrop: null,
    seasonNumber: 1,
    episodeNumber: 1,
    episodeProviderId: showProviderId,
    episodeTitle: "Episode",
    still: null,
    runtimeMinutes: 42,
    isSeasonPremiere: false,
    isShowPremiere: false,
    ...overrides,
  };
}

describe("HomeCalendarAgendaView", () => {
  describe("preview size (Balanced)", () => {
    it("renders nothing when there is nothing relevant coming up", () => {
      const { container } = render(
        <HomeCalendarAgendaView events={[]} spoilerProtection="off" size="preview" />,
      );
      expect(container).toBeEmptyDOMElement();
    });

    it("shows a small header-less list, never the Today/This week/Later headings", () => {
      render(
        <HomeCalendarAgendaView
          events={[episode(1, { date: isoOffset(0) })]}
          spoilerProtection="off"
          size="preview"
        />,
      );
      expect(screen.getByRole("heading", { name: "Coming up" })).toBeInTheDocument();
      expect(screen.getByText("Show 1")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Today" })).not.toBeInTheDocument();
    });
  });

  describe("full size (Calendar layout)", () => {
    it("shows a quiet empty state instead of nothing when there's no personally relevant release", () => {
      render(<HomeCalendarAgendaView events={[]} spoilerProtection="off" size="full" />);
      expect(screen.getByRole("heading", { name: "New & upcoming" })).toBeInTheDocument();
      expect(screen.getByText(/Nothing new right now/)).toBeInTheDocument();
    });

    it("renders the Today/This week/Later sections", () => {
      render(
        <HomeCalendarAgendaView
          events={[episode(1, { date: isoOffset(0) }), episode(2, { date: isoOffset(3) })]}
          spoilerProtection="off"
          size="full"
        />,
      );
      expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "This week" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Later" })).not.toBeInTheDocument();
    });

    it("folds a recently-released, still-unwatched episode into Today", () => {
      render(
        <HomeCalendarAgendaView
          events={[episode(1, { date: isoOffset(-3), hasAired: true })]}
          spoilerProtection="off"
          size="full"
        />,
      );
      expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
      expect(screen.getByText("Show 1")).toBeInTheDocument();
    });
  });
});
