import { describe, expect, it } from "vitest";
import type { SeasonSummary } from "@/server/media/types";
import { sortSeasons } from "./sort-seasons";

function season(overrides: Partial<SeasonSummary>): SeasonSummary {
  return {
    id: 1,
    seasonNumber: 1,
    title: "Season 1",
    overview: "",
    airDate: null,
    episodeCount: 10,
    poster: null,
    ...overrides,
  };
}

describe("sortSeasons", () => {
  it("orders regular seasons ascending by season number, not by array order", () => {
    const result = sortSeasons([
      season({ id: 3, seasonNumber: 3 }),
      season({ id: 1, seasonNumber: 1 }),
      season({ id: 2, seasonNumber: 2 }),
    ]);
    expect(result.map((s) => s.seasonNumber)).toEqual([1, 2, 3]);
  });

  it("moves Specials (season 0) to the end rather than sorting it first", () => {
    const result = sortSeasons([
      season({ id: 0, seasonNumber: 0, title: "Specials", episodeCount: 5 }),
      season({ id: 1, seasonNumber: 1 }),
      season({ id: 2, seasonNumber: 2 }),
    ]);
    expect(result.map((s) => s.seasonNumber)).toEqual([1, 2, 0]);
  });

  it("drops seasons with zero episodes, including a placeholder Specials season", () => {
    const result = sortSeasons([
      season({ id: 0, seasonNumber: 0, title: "Specials", episodeCount: 0 }),
      season({ id: 1, seasonNumber: 1, episodeCount: 0 }),
      season({ id: 2, seasonNumber: 2, episodeCount: 10 }),
    ]);
    expect(result.map((s) => s.seasonNumber)).toEqual([2]);
  });

  it("keeps a Specials season that has real episodes", () => {
    const result = sortSeasons([
      season({ id: 0, seasonNumber: 0, title: "Specials", episodeCount: 3 }),
      season({ id: 1, seasonNumber: 1, episodeCount: 10 }),
    ]);
    expect(result).toHaveLength(2);
    expect(result[1]?.seasonNumber).toBe(0);
  });
});
