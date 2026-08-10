import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { EpisodeReleaseEvent, MovieReleaseEvent } from "@/server/calendar/types";
import { CalendarMonthView } from "./calendar-month-view";

vi.mock("@/features/shows/show-tracking-actions", () => ({
  markEpisodeWatchedAction: vi.fn(),
  unmarkEpisodeWatchedAction: vi.fn(),
}));

// A month safely 2 months out from whenever this actually runs — so none
// of these fixed days-of-month can ever collide with the real "Today"/
// "Tomorrow"/"Yesterday" label (see `date.ts`), which would otherwise
// make this test's exact-text assertions flaky as real time passes.
const target = new Date();
target.setMonth(target.getMonth() + 2, 1);
const YEAR = target.getFullYear();
const MONTH = target.getMonth() + 1;

function episode(overrides: Partial<EpisodeReleaseEvent> = {}): EpisodeReleaseEvent {
  return {
    kind: "episode",
    date: `${YEAR}-${String(MONTH).padStart(2, "0")}-05`,
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
    date: `${YEAR}-${String(MONTH).padStart(2, "0")}-12`,
    relevance: "backlogMovie",
    hasAired: false,
    movieProviderId: 5,
    movieTitle: "A Movie",
    poster: null,
    backdrop: null,
    ...overrides,
  };
}

describe("CalendarMonthView", () => {
  it("shows the show's own title directly on a day with a single TV release, without needing a click", () => {
    render(
      <CalendarMonthView
        events={[episode()]}
        filter="all"
        spoilerProtection="off"
        year={YEAR}
        month={MONTH}
      />,
    );

    // Both the visible overlay text and the cell's accessible name.
    expect(screen.getAllByText("Show One").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Show One/ })).toBeInTheDocument();
  });

  it("shows the movie's own title on a day with a single movie release", () => {
    render(
      <CalendarMonthView
        events={[movie()]}
        filter="all"
        spoilerProtection="off"
        year={YEAR}
        month={MONTH}
      />,
    );

    expect(screen.getAllByText("A Movie").length).toBeGreaterThan(0);
  });

  it("never names a specific episode's own title in the grid — only the show", () => {
    render(
      <CalendarMonthView
        events={[episode({ episodeTitle: "A Spoiler-Laden Title" })]}
        filter="all"
        spoilerProtection="off"
        year={YEAR}
        month={MONTH}
      />,
    );

    expect(screen.queryByText("A Spoiler-Laden Title")).not.toBeInTheDocument();
  });

  it("falls back to kind icons (no single background) when a day has more than one release", () => {
    render(
      <CalendarMonthView
        events={[
          episode({ date: `${YEAR}-${String(MONTH).padStart(2, "0")}-05` }),
          movie({ date: `${YEAR}-${String(MONTH).padStart(2, "0")}-05` }),
        ]}
        filter="all"
        spoilerProtection="off"
        year={YEAR}
        month={MONTH}
      />,
    );

    expect(screen.getByRole("button", { name: /TV and movie release/ })).toBeInTheDocument();
    // Neither individual title is shown when there's more than one.
    expect(screen.queryByText("Show One")).not.toBeInTheDocument();
    expect(screen.queryByText("A Movie")).not.toBeInTheDocument();
  });

  it("gives a day with nothing on it no release indication", () => {
    render(
      <CalendarMonthView
        events={[]}
        filter="all"
        spoilerProtection="off"
        year={YEAR}
        month={MONTH}
      />,
    );

    expect(screen.queryByRole("button", { name: /release/ })).not.toBeInTheDocument();
  });

  it("uses the release's own backdrop as the cell's background when one is available", () => {
    render(
      <CalendarMonthView
        events={[episode({ backdrop: { path: "/backdrop.jpg" } }), movie()]}
        filter="all"
        spoilerProtection="off"
        year={YEAR}
        month={MONTH}
      />,
    );

    const day = screen.getByRole("button", { name: /Show One/ });
    expect(day.querySelector("img")).not.toBeNull();
    // Absent from a same-shaped day with no artwork at all.
    const plainDay = screen.getByRole("button", { name: /A Movie/ });
    expect(plainDay.querySelector("img")).toBeNull();
  });

  it("keeps today's day number in the primary color even while it's the selected day", () => {
    const now = new Date();
    render(
      <CalendarMonthView
        events={[]}
        filter="all"
        spoilerProtection="off"
        year={now.getFullYear()}
        month={now.getMonth() + 1}
      />,
    );

    // Today is the default-selected day, so this also covers "still
    // primary after being selected" — the bug this was fixed for.
    const todayButton = screen.getByRole("button", { name: /^Today/ });
    expect(todayButton).toHaveAttribute("aria-pressed", "true");
    expect(within(todayButton).getByText(String(now.getDate()))).toHaveClass("text-primary");
  });

  it("removes today's ring once a different day is selected — it never rings merely for being today", async () => {
    const user = userEvent.setup();
    const now = new Date();
    render(
      <CalendarMonthView
        events={[]}
        filter="all"
        spoilerProtection="off"
        year={now.getFullYear()}
        month={now.getMonth() + 1}
      />,
    );

    const todayButton = screen.getByRole("button", { name: /^Today/ });
    expect(todayButton.className).toMatch(/ring-2 ring-primary/);

    const otherButton = screen.getAllByRole("button").find((button) => button !== todayButton);
    if (!otherButton) throw new Error("expected more than one day cell in the grid");
    await user.click(otherButton);

    expect(todayButton.className).not.toMatch(/ring-2 ring-primary/);
  });

  it("rings the selected day even when it has its own artwork background", async () => {
    const user = userEvent.setup();
    render(
      <CalendarMonthView
        events={[episode({ backdrop: { path: "/backdrop.jpg" } })]}
        filter="all"
        spoilerProtection="off"
        year={YEAR}
        month={MONTH}
      />,
    );

    const day = screen.getByRole("button", { name: /Show One/ });
    expect(day.className).not.toMatch(/ring-2 ring-primary/);

    await user.click(day);
    expect(day.className).toMatch(/ring-2 ring-primary/);
    // Not `ring-inset` — an inset ring would be painted underneath (and
    // hidden by) the cell's own Image/scrim children.
    expect(day.className).not.toMatch(/ring-inset/);
  });

  it("offers a way back to the current month when viewing a different one", () => {
    render(
      <CalendarMonthView
        events={[]}
        filter="all"
        spoilerProtection="off"
        year={YEAR}
        month={MONTH}
      />,
    );

    const now = new Date();
    const todayLink = screen.getByRole("link", { name: "Today" });
    expect(todayLink).toHaveAttribute(
      "href",
      `/calendar?view=calendar&month=${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    );
  });

  it("hides the 'Today' control while already viewing the current month", () => {
    const now = new Date();
    render(
      <CalendarMonthView
        events={[]}
        filter="all"
        spoilerProtection="off"
        year={now.getFullYear()}
        month={now.getMonth() + 1}
      />,
    );

    expect(screen.queryByRole("link", { name: "Today" })).not.toBeInTheDocument();
  });
});
