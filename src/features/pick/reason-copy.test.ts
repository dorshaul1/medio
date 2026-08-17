import { describe, expect, it } from "vitest";
import { reasonCopy } from "./reason-copy";

describe("reasonCopy", () => {
  it("renders every reason kind as non-empty, human copy", () => {
    expect(reasonCopy({ kind: "continueActiveShow" })).toBe("Continue where you left off");
    expect(reasonCopy({ kind: "recentContinuation", daysAgo: 0 })).toBe(
      "You watched an episode today",
    );
    expect(reasonCopy({ kind: "recentContinuation", daysAgo: 1 })).toBe(
      "You watched an episode yesterday",
    );
    expect(reasonCopy({ kind: "finishSoon", remainingEpisodes: 1 })).toBe("Only 1 episode left");
    expect(reasonCopy({ kind: "finishSoon", remainingEpisodes: 3 })).toBe("Only 3 episodes left");
    expect(reasonCopy({ kind: "backlogIntent" })).toBe("On your Backlog");
    expect(reasonCopy({ kind: "watchlistIntent" })).toBe("On your Watchlist");
    expect(reasonCopy({ kind: "highGenreAffinity", genreName: "Drama" })).toBe(
      "You watch a lot of Drama",
    );
    expect(reasonCopy({ kind: "directorAffinity", directorName: "Bong Joon-ho" })).toContain(
      "Bong Joon-ho",
    );
    expect(reasonCopy({ kind: "timeFit", minutes: 42 })).toBe("About 42 min");
    expect(reasonCopy({ kind: "similarToWatched", title: "Parasite" })).toContain("Parasite");
    expect(reasonCopy({ kind: "popularDiscovery" })).toBe("Popular right now");
  });

  it("never fabricates a match percentage or numeric score", () => {
    const copy = reasonCopy({ kind: "similarToWatched", title: "Parasite" });
    expect(copy).not.toMatch(/%|\d+\s*\/\s*\d+/);
  });
});
