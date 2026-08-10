import { describe, expect, it } from "vitest";
import { rankReleaseGroups } from "./rank";
import type { EpisodeReleaseEvent, ReleaseEventGroup } from "./types";

function episode(overrides: Partial<EpisodeReleaseEvent> = {}): EpisodeReleaseEvent {
  return {
    kind: "episode",
    date: "2026-08-17",
    relevance: "activeShow",
    hasAired: false,
    showProviderId: 1,
    showTitle: "Show",
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

function group(date: string, overrides: Partial<EpisodeReleaseEvent> = {}): ReleaseEventGroup {
  return { date, events: [episode({ date, ...overrides })] };
}

function titleOf(group: ReleaseEventGroup): string | undefined {
  const [event] = group.events;
  return event?.kind === "episode" ? event.showTitle : event?.movieTitle;
}

describe("rankReleaseGroups", () => {
  it("orders chronologically first, across different dates", () => {
    const groups = rankReleaseGroups([
      group("2026-08-24", { showTitle: "Later" }),
      group("2026-08-17", { showTitle: "Sooner" }),
    ]);
    expect(groups.map((g) => titleOf(g))).toEqual(["Sooner", "Later"]);
  });

  it("ranks by personal relevance within the same date — active show before backlog", () => {
    const groups = rankReleaseGroups([
      group("2026-08-17", { showTitle: "Backlog", relevance: "backlogShow" }),
      group("2026-08-17", { showTitle: "Active", relevance: "activeShow" }),
    ]);
    expect(groups.map((g) => titleOf(g))).toEqual(["Active", "Backlog"]);
  });

  it("ranks Backlog above Watchlist", () => {
    const groups = rankReleaseGroups([
      group("2026-08-17", { showTitle: "Watchlist", relevance: "watchlistShow" }),
      group("2026-08-17", { showTitle: "Backlog", relevance: "backlogShow" }),
    ]);
    expect(groups.map((g) => titleOf(g))).toEqual(["Backlog", "Watchlist"]);
  });

  it("ranks Shows above Movies for the same intent tier", () => {
    const groups = rankReleaseGroups([
      {
        date: "2026-08-17",
        events: [
          {
            kind: "movieRelease" as const,
            date: "2026-08-17",
            relevance: "backlogMovie" as const,
            hasAired: false,
            movieProviderId: 1,
            movieTitle: "A Movie",
            poster: null,
            backdrop: null,
          },
        ],
      },
      group("2026-08-17", { showTitle: "A Show", relevance: "backlogShow" }),
    ]);
    const titles = groups.map((g) => {
      const [event] = g.events;
      return event?.kind === "episode" ? event.showTitle : event?.movieTitle;
    });
    expect(titles).toEqual(["A Show", "A Movie"]);
  });

  it("breaks ties with a stable, alphabetical title order — never provider popularity", () => {
    const groups = rankReleaseGroups([
      group("2026-08-17", { showTitle: "Zeta" }),
      group("2026-08-17", { showTitle: "Alpha" }),
    ]);
    expect(groups.map((g) => titleOf(g))).toEqual(["Alpha", "Zeta"]);
  });
});
