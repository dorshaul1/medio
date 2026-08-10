import { describe, expect, it } from "vitest";
import { resolveShowViewingState } from "./derived-state";

const base = {
  explicitState: null as null,
  uniqueWatchedAiredCount: 0,
  airedEpisodeCount: 10,
  showStatus: "Returning Series",
  hasKnownFutureEpisode: false,
};

describe("resolveShowViewingState", () => {
  it("resolves unwatched when there's no relevant watch history", () => {
    expect(resolveShowViewingState(base)).toBe("unwatched");
  });

  it("resolves unwatched even for a show with zero aired episodes yet", () => {
    expect(
      resolveShowViewingState({ ...base, airedEpisodeCount: 0, uniqueWatchedAiredCount: 0 }),
    ).toBe("unwatched");
  });

  it("resolves watching when some but not all aired episodes are watched", () => {
    expect(resolveShowViewingState({ ...base, uniqueWatchedAiredCount: 4 })).toBe("watching");
  });

  it("resolves completed when all aired episodes are watched and the show has concluded", () => {
    expect(
      resolveShowViewingState({
        ...base,
        uniqueWatchedAiredCount: 10,
        showStatus: "Ended",
      }),
    ).toBe("completed");
  });

  it("resolves completed for a Canceled show too", () => {
    expect(
      resolveShowViewingState({
        ...base,
        uniqueWatchedAiredCount: 10,
        showStatus: "Canceled",
      }),
    ).toBe("completed");
  });

  it("resolves waiting when all aired episodes are watched, the show is active, and a future episode is known", () => {
    expect(
      resolveShowViewingState({
        ...base,
        uniqueWatchedAiredCount: 10,
        hasKnownFutureEpisode: true,
      }),
    ).toBe("waiting");
  });

  it("resolves caught_up when all aired episodes are watched, the show is active, but no future episode is known", () => {
    expect(
      resolveShowViewingState({
        ...base,
        uniqueWatchedAiredCount: 10,
        hasKnownFutureEpisode: false,
      }),
    ).toBe("caught_up");
  });

  it("resolves on_hold from explicit state, regardless of watch history", () => {
    expect(
      resolveShowViewingState({ ...base, explicitState: "on_hold", uniqueWatchedAiredCount: 10 }),
    ).toBe("on_hold");
  });

  it("resolves dropped from explicit state, regardless of watch history", () => {
    expect(resolveShowViewingState({ ...base, explicitState: "dropped" })).toBe("dropped");
  });

  it("explicit on_hold/dropped both win over an otherwise-completed show", () => {
    expect(
      resolveShowViewingState({
        ...base,
        explicitState: "on_hold",
        uniqueWatchedAiredCount: 10,
        showStatus: "Ended",
      }),
    ).toBe("on_hold");
  });
});
