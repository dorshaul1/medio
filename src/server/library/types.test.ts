import { describe, expect, it } from "vitest";
import type { LibraryItem } from "./types";
import { groupLibraryItems, libraryStateGroup } from "./types";

const BASE = {
  mediaProviderId: 1,
  title: "Fixture",
  poster: null,
  year: 2020,
  personalActivityAt: new Date("2024-01-01"),
  addedAt: new Date("2024-01-01"),
  rating: null,
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

describe("groupLibraryItems", () => {
  function plannedMovie(id: number): LibraryItem {
    return {
      ...BASE,
      mediaProviderId: id,
      kind: "planned-movie",
      mediaType: "movie",
      intent: "watchlist",
    };
  }

  function watchingShow(id: number): LibraryItem {
    return {
      ...BASE,
      mediaProviderId: id,
      kind: "tracked-show",
      mediaType: "show",
      explicitState: "watching",
      derivedState: "watching",
      airedEpisodeCount: 10,
      watchedEpisodeCount: 5,
      nextEpisode: null,
    };
  }

  function droppedShow(id: number): LibraryItem {
    return {
      ...BASE,
      mediaProviderId: id,
      kind: "tracked-show",
      mediaType: "show",
      explicitState: "dropped",
      derivedState: "dropped",
      airedEpisodeCount: 10,
      watchedEpisodeCount: 2,
      nextEpisode: null,
    };
  }

  it("clusters into the In progress -> Planned -> Paused -> Finished order regardless of input order", () => {
    const items = [droppedShow(1), plannedMovie(2), watchingShow(3)];
    const groups = groupLibraryItems(items);
    expect(groups.map((entry) => entry.group)).toEqual(["in_progress", "planned", "paused"]);
    expect(groups[0]?.items).toEqual([watchingShow(3)]);
  });

  it("omits empty groups rather than rendering a header with no items", () => {
    const groups = groupLibraryItems([plannedMovie(1)]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.group).toBe("planned");
  });

  it("keeps items in their original relative order within a group", () => {
    const items = [watchingShow(1), watchingShow(2), watchingShow(3)];
    const groups = groupLibraryItems(items);
    expect(groups[0]?.items.map((item) => item.mediaProviderId)).toEqual([1, 2, 3]);
  });

  it("returns no groups for an empty page", () => {
    expect(groupLibraryItems([])).toEqual([]);
  });
});
