import { describe, expect, it } from "vitest";
import { buildReleaseTimeline } from "@/server/calendar/timeline";
import type { EpisodeReleaseEvent } from "@/server/calendar/types";
import { buildHomeCalendarAgenda, buildHomeCalendarPreview } from "./calendar-agenda";

const NOW = new Date(Date.UTC(2026, 7, 17)); // Aug 17, 2026

function episode(
  date: string,
  showProviderId: number,
  overrides: Partial<EpisodeReleaseEvent> = {},
): EpisodeReleaseEvent {
  return {
    kind: "episode",
    date,
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

describe("buildHomeCalendarAgenda", () => {
  it("folds Calendar's Recently released into Today", () => {
    const timeline = buildReleaseTimeline(
      [episode("2026-08-14", 1, { hasAired: true }), episode("2026-08-17", 2)],
      NOW,
      false,
    );
    const agenda = buildHomeCalendarAgenda(timeline, 6);
    expect(agenda.today).toHaveLength(2);
  });

  it("folds Calendar's Tomorrow into This week", () => {
    const timeline = buildReleaseTimeline([episode("2026-08-18", 1)], NOW, false);
    const agenda = buildHomeCalendarAgenda(timeline, 6);
    expect(agenda.thisWeek).toHaveLength(1);
  });

  it("caps Later at the given limit", () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      episode("2026-09-10", i + 1, { episodeProviderId: i + 1 }),
    );
    const timeline = buildReleaseTimeline(events, NOW, false);
    const agenda = buildHomeCalendarAgenda(timeline, 4);
    expect(agenda.later).toHaveLength(4);
  });

  it("returns empty buckets, never throws, for an empty timeline", () => {
    const timeline = buildReleaseTimeline([], NOW, false);
    const agenda = buildHomeCalendarAgenda(timeline, 6);
    expect(agenda).toEqual({ today: [], thisWeek: [], later: [] });
  });
});

describe("buildHomeCalendarPreview", () => {
  it("caps the combined forward-looking list at the given limit", () => {
    const events = [
      episode("2026-08-17", 1),
      episode("2026-08-18", 2),
      episode("2026-08-19", 3),
      episode("2026-08-20", 4),
    ];
    const timeline = buildReleaseTimeline(events, NOW, false);
    const preview = buildHomeCalendarPreview(timeline, 2);
    expect(preview).toHaveLength(2);
  });

  it("never reaches into Later — only recent/today/tomorrow/thisWeek feed it", () => {
    const timeline = buildReleaseTimeline([episode("2026-09-10", 1)], NOW, false);
    const preview = buildHomeCalendarPreview(timeline, 10);
    expect(preview).toHaveLength(0);
  });

  it("returns an empty list for an empty timeline", () => {
    const timeline = buildReleaseTimeline([], NOW, false);
    expect(buildHomeCalendarPreview(timeline, 5)).toHaveLength(0);
  });
});
