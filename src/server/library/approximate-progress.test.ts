import { describe, expect, it } from "vitest";
import type { SeasonSummary } from "@/server/media/types";
import { approximateAiredEpisodeCount } from "./approximate-progress";

function season(overrides: Partial<SeasonSummary>): SeasonSummary {
  return {
    id: 1,
    seasonNumber: 1,
    title: "Season 1",
    overview: null,
    airDate: null,
    episodeCount: 10,
    poster: null,
    ...overrides,
  };
}

describe("approximateAiredEpisodeCount", () => {
  it("counts a season's full episode count once it has started airing", () => {
    const total = approximateAiredEpisodeCount([
      season({ seasonNumber: 1, airDate: "2020-01-01", episodeCount: 8 }),
    ]);
    expect(total).toBe(8);
  });

  it("excludes a season that hasn't aired yet", () => {
    const total = approximateAiredEpisodeCount([
      season({ seasonNumber: 1, airDate: "2099-01-01", episodeCount: 8 }),
    ]);
    expect(total).toBe(0);
  });

  it("excludes Specials (season 0) even if aired", () => {
    const total = approximateAiredEpisodeCount([
      season({ seasonNumber: 0, airDate: "2020-01-01", episodeCount: 3 }),
      season({ seasonNumber: 1, airDate: "2020-01-01", episodeCount: 8 }),
    ]);
    expect(total).toBe(8);
  });

  it("excludes a season with no air date on file", () => {
    const total = approximateAiredEpisodeCount([season({ seasonNumber: 1, airDate: null })]);
    expect(total).toBe(0);
  });

  it("sums every aired regular season", () => {
    const total = approximateAiredEpisodeCount([
      season({ seasonNumber: 1, airDate: "2011-01-01", episodeCount: 10 }),
      season({ seasonNumber: 2, airDate: "2012-01-01", episodeCount: 10 }),
      season({ seasonNumber: 3, airDate: "2099-01-01", episodeCount: 10 }),
    ]);
    expect(total).toBe(20);
  });
});
