import { describe, expect, it } from "vitest";
import { episodeCoordinateLabel, relevanceLabel } from "./event-copy";

describe("episodeCoordinateLabel", () => {
  it("labels season 1 episode 1 as a series premiere", () => {
    expect(
      episodeCoordinateLabel({
        seasonNumber: 1,
        episodeNumber: 1,
        isSeasonPremiere: true,
        isShowPremiere: true,
      }),
    ).toBe("Series premiere");
  });

  it("labels a later season's episode 1 as a season premiere", () => {
    expect(
      episodeCoordinateLabel({
        seasonNumber: 3,
        episodeNumber: 1,
        isSeasonPremiere: true,
        isShowPremiere: false,
      }),
    ).toBe("Season 3 premiere");
  });

  it("labels an ordinary episode with its plain coordinate", () => {
    expect(
      episodeCoordinateLabel({
        seasonNumber: 2,
        episodeNumber: 5,
        isSeasonPremiere: false,
        isShowPremiere: false,
      }),
    ).toBe("S2 E5");
  });
});

describe("relevanceLabel", () => {
  it("returns null for an actively tracked show", () => {
    expect(relevanceLabel("activeShow")).toBeNull();
  });

  it.each([
    ["backlogShow", "Backlog"],
    ["backlogMovie", "Backlog"],
    ["watchlistShow", "Watchlist"],
    ["watchlistMovie", "Watchlist"],
  ] as const)("labels %s as %s", (relevance, expected) => {
    expect(relevanceLabel(relevance)).toBe(expected);
  });
});
