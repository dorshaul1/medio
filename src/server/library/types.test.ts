import { describe, expect, it } from "vitest";
import type { LibraryItem } from "./types";
import { libraryStateGroup } from "./types";

const BASE = {
  mediaProviderId: 1,
  title: "Fixture",
  poster: null,
  year: 2020,
  personalActivityAt: new Date("2024-01-01"),
  addedAt: new Date("2024-01-01"),
};

describe("libraryStateGroup", () => {
  it("groups planned movies and shows as planned", () => {
    const plannedMovie: LibraryItem = {
      ...BASE,
      kind: "planned-movie",
      mediaType: "movie",
      intent: "watchlist",
    };
    const plannedShow: LibraryItem = {
      ...BASE,
      kind: "planned-show",
      mediaType: "show",
      intent: "backlog",
    };
    expect(libraryStateGroup(plannedMovie)).toBe("planned");
    expect(libraryStateGroup(plannedShow)).toBe("planned");
  });

  it("groups a watched movie as finished", () => {
    const item: LibraryItem = {
      ...BASE,
      kind: "watched-movie",
      mediaType: "movie",
      watchCount: 1,
      lastWatchedAt: new Date(),
    };
    expect(libraryStateGroup(item)).toBe("finished");
  });

  it.each([
    ["unwatched", "in_progress"],
    ["watching", "in_progress"],
    ["caught_up", "in_progress"],
    ["waiting", "in_progress"],
    ["on_hold", "paused"],
    ["dropped", "paused"],
    ["completed", "finished"],
  ] as const)("groups a tracked show with derivedState %s as %s", (derivedState, expected) => {
    const item: LibraryItem = {
      ...BASE,
      kind: "tracked-show",
      mediaType: "show",
      explicitState: "watching",
      derivedState,
      airedEpisodeCount: 10,
      watchedEpisodeCount: 5,
      nextEpisode: null,
    };
    expect(libraryStateGroup(item)).toBe(expected);
  });
});
