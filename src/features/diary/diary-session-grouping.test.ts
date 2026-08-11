import { describe, expect, it } from "vitest";
import type { EpisodeDiaryEntry, MovieDiaryEntry } from "@/server/diary/types";
import { groupDiarySessions, sessionEpisodeLabel } from "./diary-session-grouping";

function episode(overrides: Partial<EpisodeDiaryEntry> & { id: string }): EpisodeDiaryEntry {
  return {
    kind: "episode",
    watchedAt: new Date("2026-08-10T20:00:00Z"),
    ordinal: 1,
    showProviderId: 1404,
    seasonNumber: 2,
    episodeNumber: 1,
    episodeProviderId: 9000,
    showTitle: "Eighth Watch",
    episodeTitle: "Episode",
    showPoster: null,
    episodeStill: null,
    ...overrides,
  };
}

function movie(overrides: Partial<MovieDiaryEntry> & { id: string }): MovieDiaryEntry {
  return {
    kind: "movie",
    watchedAt: new Date("2026-08-10T20:00:00Z"),
    ordinal: 1,
    movieProviderId: 555,
    title: "The Sixth Reel",
    year: 2020,
    poster: null,
    ...overrides,
  };
}

const at = (hour: number, minute = 0) => new Date(Date.UTC(2026, 7, 10, hour, minute));

describe("groupDiarySessions", () => {
  it("groups sequential same-show episodes watched close together into one session", () => {
    const entries = [
      episode({ id: "e1", episodeNumber: 4, watchedAt: at(20, 0) }),
      episode({ id: "e2", episodeNumber: 5, watchedAt: at(20, 45) }),
      episode({ id: "e3", episodeNumber: 6, watchedAt: at(21, 30) }),
    ];

    const groups = groupDiarySessions(entries);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kind: "session", showProviderId: 1404 });
    if (groups[0]?.kind === "session") {
      expect(groups[0].entries.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
    }
  });

  it("keeps a lone episode as a single row, not a one-item session", () => {
    const groups = groupDiarySessions([episode({ id: "e1" })]);
    expect(groups).toEqual([{ kind: "single", entry: expect.objectContaining({ id: "e1" }) }]);
  });

  it("never groups across a different show", () => {
    const entries = [
      episode({ id: "e1", showProviderId: 1404, episodeNumber: 1, watchedAt: at(20, 0) }),
      episode({ id: "e2", showProviderId: 999, episodeNumber: 1, watchedAt: at(20, 10) }),
    ];
    const groups = groupDiarySessions(entries);
    expect(groups).toEqual([
      { kind: "single", entry: expect.objectContaining({ id: "e1" }) },
      { kind: "single", entry: expect.objectContaining({ id: "e2" }) },
    ]);
  });

  it("never groups across too large a gap", () => {
    const entries = [
      episode({ id: "e1", episodeNumber: 1, watchedAt: at(9, 0) }),
      episode({ id: "e2", episodeNumber: 2, watchedAt: at(22, 0) }), // 13h later, same day
    ];
    const groups = groupDiarySessions(entries);
    expect(groups.every((g) => g.kind === "single")).toBe(true);
  });

  it("a movie always breaks a session and stays its own row", () => {
    const entries = [
      episode({ id: "e1", episodeNumber: 1, watchedAt: at(20, 0) }),
      movie({ id: "m1", watchedAt: at(20, 20) }),
      episode({ id: "e2", episodeNumber: 2, watchedAt: at(20, 40) }),
    ];
    const groups = groupDiarySessions(entries);
    expect(groups.map((g) => g.kind)).toEqual(["single", "single", "single"]);
  });

  it("an unavailable entry always breaks a session", () => {
    const entries: (EpisodeDiaryEntry | ReturnType<typeof movie>)[] = [
      episode({ id: "e1", episodeNumber: 1, watchedAt: at(20, 0) }),
    ];
    const unavailable = {
      kind: "unavailable" as const,
      eventType: "episode" as const,
      id: "u1",
      watchedAt: at(20, 20),
      ordinal: 1,
      showProviderId: 1404,
      seasonNumber: 2,
      episodeNumber: 3,
    };
    const groups = groupDiarySessions([...entries, unavailable]);
    expect(groups.map((g) => g.kind)).toEqual(["single", "single"]);
  });

  it("orders a session's entries chronologically regardless of the page's own sort direction", () => {
    // Newest-first input order (the default Diary sort).
    const entries = [
      episode({ id: "e3", episodeNumber: 6, watchedAt: at(21, 30) }),
      episode({ id: "e2", episodeNumber: 5, watchedAt: at(20, 45) }),
      episode({ id: "e1", episodeNumber: 4, watchedAt: at(20, 0) }),
    ];
    const groups = groupDiarySessions(entries);
    expect(groups).toHaveLength(1);
    if (groups[0]?.kind === "session") {
      expect(groups[0].entries.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
    }
  });

  it("preserves a mixed-rewatch session's individual ordinals", () => {
    const entries = [
      episode({ id: "e1", episodeNumber: 1, ordinal: 1, watchedAt: at(20, 0) }),
      episode({ id: "e2", episodeNumber: 2, ordinal: 2, watchedAt: at(20, 30) }),
    ];
    const groups = groupDiarySessions(entries);
    if (groups[0]?.kind === "session") {
      expect(groups[0].entries.map((e) => e.ordinal)).toEqual([1, 2]);
    }
  });
});

describe("sessionEpisodeLabel", () => {
  it("formats a contiguous ascending run as a range", () => {
    const entries = [4, 5, 6].map((n) => episode({ id: `e${n}`, episodeNumber: n }));
    expect(sessionEpisodeLabel(entries)).toBe("S2 E4-E6");
  });

  it("lists non-contiguous same-season episodes individually", () => {
    const entries = [4, 6, 9].map((n) => episode({ id: `e${n}`, episodeNumber: n }));
    expect(sessionEpisodeLabel(entries)).toBe("S2 E4, E6, E9");
  });

  it("returns null once a session spans more than one season", () => {
    const entries = [
      episode({ id: "e1", seasonNumber: 1, episodeNumber: 10 }),
      episode({ id: "e2", seasonNumber: 2, episodeNumber: 1 }),
    ];
    expect(sessionEpisodeLabel(entries)).toBeNull();
  });
});
