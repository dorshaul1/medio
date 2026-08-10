import { describe, expect, it } from "vitest";
import { filterEligible, isEligible, relaxTimeConstraint } from "./eligibility";
import type { DecisionContext, DiscoveryMovieCandidate, DiscoveryShowCandidate } from "./types";

function movie(overrides: Partial<DiscoveryMovieCandidate> = {}): DiscoveryMovieCandidate {
  return {
    kind: "discoveryMovie",
    mediaType: "movie",
    mediaProviderId: 1,
    title: "A Movie",
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes: 100,
    source: "popular",
    seedTitle: null,
    ...overrides,
  };
}

function show(overrides: Partial<DiscoveryShowCandidate> = {}): DiscoveryShowCandidate {
  return {
    kind: "discoveryShow",
    mediaType: "show",
    mediaProviderId: 2,
    title: "A Show",
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes: 40,
    source: "popular",
    seedTitle: null,
    ...overrides,
  };
}

const ANY: DecisionContext = { mediaType: "any", timeBudgetMinutes: null };

describe("isEligible — media type", () => {
  it("'any' matches both movies and shows", () => {
    expect(isEligible(movie(), ANY)).toBe(true);
    expect(isEligible(show(), ANY)).toBe(true);
  });

  it("'movie' excludes shows, never silently relaxed", () => {
    const context: DecisionContext = { mediaType: "movie", timeBudgetMinutes: null };
    expect(isEligible(movie(), context)).toBe(true);
    expect(isEligible(show(), context)).toBe(false);
  });

  it("'show' excludes movies", () => {
    const context: DecisionContext = { mediaType: "show", timeBudgetMinutes: null };
    expect(isEligible(show(), context)).toBe(true);
    expect(isEligible(movie(), context)).toBe(false);
  });
});

describe("isEligible — time budget", () => {
  it("Quick tier (35 min) excludes a candidate with unknown runtime", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 35 };
    expect(isEligible(movie({ runtimeMinutes: null }), context)).toBe(false);
  });

  it("Quick tier excludes a candidate longer than 35 minutes", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 35 };
    expect(isEligible(movie({ runtimeMinutes: 36 }), context)).toBe(false);
  });

  it("Quick tier includes a candidate at exactly 35 minutes", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 35 };
    expect(isEligible(movie({ runtimeMinutes: 35 }), context)).toBe(true);
  });

  it("About an hour tier (65 min) includes a candidate with unknown runtime", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 65 };
    expect(isEligible(movie({ runtimeMinutes: null }), context)).toBe(true);
  });

  it("About an hour tier excludes a candidate longer than 65 minutes", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 65 };
    expect(isEligible(movie({ runtimeMinutes: 66 }), context)).toBe(false);
  });

  it("Movie night tier (150 min) includes a candidate with unknown runtime", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 150 };
    expect(isEligible(movie({ runtimeMinutes: null }), context)).toBe(true);
  });

  it("Movie night tier excludes a candidate longer than 150 minutes", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 150 };
    expect(isEligible(movie({ runtimeMinutes: 151 }), context)).toBe(false);
  });

  it("no time budget includes every runtime, known or unknown", () => {
    expect(isEligible(movie({ runtimeMinutes: null }), ANY)).toBe(true);
    expect(isEligible(movie({ runtimeMinutes: 999 }), ANY)).toBe(true);
  });
});

describe("filterEligible", () => {
  it("filters a mixed candidate list down to only eligible ones", () => {
    const context: DecisionContext = { mediaType: "movie", timeBudgetMinutes: 35 };
    const result = filterEligible(
      [
        movie({ mediaProviderId: 1, runtimeMinutes: 30 }),
        show({ mediaProviderId: 2 }),
        movie({ mediaProviderId: 3, runtimeMinutes: 200 }),
      ],
      context,
    );
    expect(result.map((c) => c.mediaProviderId)).toEqual([1]);
  });
});

describe("relaxTimeConstraint", () => {
  it("clears the time budget but never touches media type", () => {
    const context: DecisionContext = { mediaType: "show", timeBudgetMinutes: 35 };
    expect(relaxTimeConstraint(context)).toEqual({ mediaType: "show", timeBudgetMinutes: null });
  });
});
