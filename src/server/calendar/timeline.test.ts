import { describe, expect, it } from "vitest";
import { buildReleaseTimeline } from "./timeline";
import type { EpisodeReleaseEvent } from "./types";

const NOW = new Date(Date.UTC(2026, 7, 17)); // Aug 17, 2026

function episode(date: string, overrides: Partial<EpisodeReleaseEvent> = {}): EpisodeReleaseEvent {
  return {
    kind: "episode",
    date,
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

describe("buildReleaseTimeline", () => {
  it("buckets a same-day event into today", () => {
    const timeline = buildReleaseTimeline([episode("2026-08-17")], NOW, false);
    expect(timeline.today).toHaveLength(1);
    expect(timeline.tomorrow).toHaveLength(0);
  });

  it("buckets the next day into tomorrow", () => {
    const timeline = buildReleaseTimeline([episode("2026-08-18")], NOW, false);
    expect(timeline.tomorrow).toHaveLength(1);
  });

  it("buckets 2-7 days out into thisWeek", () => {
    const timeline = buildReleaseTimeline([episode("2026-08-22")], NOW, false); // +5 days
    expect(timeline.thisWeek).toHaveLength(1);
  });

  it("buckets beyond thisWeek but within the horizon into later", () => {
    const timeline = buildReleaseTimeline([episode("2026-09-10")], NOW, false); // +24 days
    expect(timeline.later).toHaveLength(1);
  });

  it("excludes anything beyond the upcoming horizon entirely", () => {
    const timeline = buildReleaseTimeline([episode("2027-06-01")], NOW, false);
    expect(timeline.later).toHaveLength(0);
    expect(timeline.thisWeek).toHaveLength(0);
  });

  it("buckets a recent past date into recent", () => {
    const timeline = buildReleaseTimeline([episode("2026-08-14")], NOW, false); // -3 days
    expect(timeline.recent).toHaveLength(1);
  });

  it("excludes a past date beyond the recent window entirely", () => {
    const timeline = buildReleaseTimeline([episode("2026-07-01")], NOW, false);
    expect(timeline.recent).toHaveLength(0);
    expect(timeline.today).toHaveLength(0);
  });

  it("crosses a year boundary correctly (December to January)", () => {
    const decemberNow = new Date(Date.UTC(2026, 11, 30));
    const timeline = buildReleaseTimeline([episode("2027-01-02")], decemberNow, false); // +3 days
    expect(timeline.thisWeek).toHaveLength(1);
  });

  it("groups same-show same-date events within a bucket", () => {
    const timeline = buildReleaseTimeline(
      [episode("2026-08-17", { episodeNumber: 1 }), episode("2026-08-17", { episodeNumber: 2 })],
      NOW,
      false,
    );
    expect(timeline.today).toHaveLength(1);
    expect(timeline.today[0]?.events).toHaveLength(2);
  });

  it("returns every bucket even when completely empty — never throws on no data", () => {
    const timeline = buildReleaseTimeline([], NOW, false);
    expect(timeline).toEqual({ recent: [], today: [], tomorrow: [], thisWeek: [], later: [] });
  });
});
