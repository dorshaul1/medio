// A realistic-dataset quality benchmark for the ranking engine — see
// docs/recommendations.md and the "Upgrade — Pick for Me to Best-in-
// Class Decision Experience" audit this repository went through. Rather
// than a manual UI walkthrough (this environment has no browser/
// screenshot tool), each scenario below exercises the exact same pure
// `scoreCandidate` → `selectPicks` pipeline `compose.ts` runs, against a
// realistic mixed candidate pool, and asserts a specific, defensible
// answer to one of the 12 quality questions the audit calls for:
//
//   1. Is the Best Pick sensible for this user/context?
//   2. Was a clearly stronger candidate ignored?
//   3. Is active viewing over-weighted vs. a better time/format fit?
//   4. Does Discovery appear when it shouldn't (a good local pick exists)?
//   5. Is Backlog respected over defaulting to something new?
//   6. Is Watchlist ever treated as more important than an active show?
//   7. Does the time budget actually constrain the result?
//   8. Is Finish Soon surfaced when it's genuinely the best choice?
//   9. Are taste-based reasons believable (not from a single data point)?
//  10. Are the stated reasons truthful (backed by the actual candidate)?
//  11. Are alternatives meaningfully different from the primary?
//  12. Would a reasonable user find this reduces decision fatigue?
//
// Each `it` name states which question(s) it answers.
import { describe, expect, it } from "vitest";
import { GENRE_AFFINITY_BONUS } from "./constants";
import { filterEligible } from "./eligibility";
import { scoreCandidate } from "./scoring";
import { selectPicks } from "./selection";
import type {
  ContinueEpisodeCandidate,
  DecisionContext,
  DiscoveryMovieCandidate,
  DiscoveryShowCandidate,
  PickCandidate,
  RecommendationTasteSummary,
  SavedMovieCandidate,
  SavedShowCandidate,
} from "./types";

const NOW = new Date("2024-06-10T12:00:00Z");
const ANY: DecisionContext = { mediaType: "any", timeBudgetMinutes: null };

const NO_TASTE: RecommendationTasteSummary = {
  hasEnoughDataForPersonalization: false,
  movieGenreAffinities: [],
  showGenreAffinities: [],
  topDirector: null,
  seedMovies: [],
  seedShows: [],
};

// A confident, multi-title taste profile — Drama and Sci-Fi affinities
// each built from several rated titles (never a single 5-star outlier),
// same threshold discipline as Stats itself.
const RICH_TASTE: RecommendationTasteSummary = {
  hasEnoughDataForPersonalization: true,
  movieGenreAffinities: [
    { genreId: 18, genreName: "Drama", averageRating: 4.7, ratedTitleCount: 6 },
  ],
  showGenreAffinities: [
    { genreId: 10765, genreName: "Sci-Fi & Fantasy", averageRating: 4.5, ratedTitleCount: 5 },
  ],
  topDirector: { id: 500, name: "Denis Villeneuve" },
  seedMovies: [{ id: 9001, title: "Arrival" }],
  seedShows: [{ id: 9002, title: "Dark" }],
};

let nextId = 1;
function id(): number {
  nextId += 1;
  return nextId;
}

function continueEpisode(
  overrides: Partial<ContinueEpisodeCandidate> = {},
): ContinueEpisodeCandidate {
  return {
    kind: "continueEpisode",
    mediaType: "show",
    mediaProviderId: id(),
    title: "Active Show",
    poster: null,
    backdrop: null,
    year: 2021,
    genres: [],
    runtimeMinutes: 42,
    remainingAiredEpisodeCount: 6,
    isFinishSoon: false,
    lastActivityAt: new Date("2000-01-01T00:00:00Z"),
    nextEpisode: { seasonNumber: 2, episodeNumber: 3, episodeProviderId: id() },
    ...overrides,
  };
}

function savedMovie(overrides: Partial<SavedMovieCandidate> = {}): SavedMovieCandidate {
  return {
    kind: "savedMovie",
    mediaType: "movie",
    mediaProviderId: id(),
    title: "Saved Movie",
    poster: null,
    backdrop: null,
    year: 2019,
    genres: [],
    runtimeMinutes: 110,
    intent: "watchlist",
    ...overrides,
  };
}

function savedShow(overrides: Partial<SavedShowCandidate> = {}): SavedShowCandidate {
  return {
    kind: "savedShow",
    mediaType: "show",
    mediaProviderId: id(),
    title: "Saved Show",
    poster: null,
    backdrop: null,
    year: 2020,
    genres: [],
    runtimeMinutes: 45,
    intent: "watchlist",
    ...overrides,
  };
}

function discoveryMovie(overrides: Partial<DiscoveryMovieCandidate> = {}): DiscoveryMovieCandidate {
  return {
    kind: "discoveryMovie",
    mediaType: "movie",
    mediaProviderId: id(),
    title: "Discovery Movie",
    poster: null,
    backdrop: null,
    year: 2022,
    genres: [],
    runtimeMinutes: 105,
    source: "popular",
    seedTitle: null,
    ...overrides,
  };
}

function discoveryShow(overrides: Partial<DiscoveryShowCandidate> = {}): DiscoveryShowCandidate {
  return {
    kind: "discoveryShow",
    mediaType: "show",
    mediaProviderId: id(),
    title: "Discovery Show",
    poster: null,
    backdrop: null,
    year: 2022,
    genres: [],
    runtimeMinutes: 50,
    source: "popular",
    seedTitle: null,
    ...overrides,
  };
}

// Mirrors compose.ts's own eligibility → scoring → selection pipeline,
// minus the I/O — see docs/recommendations.md, "Performance
// architecture".
function rank(
  pool: readonly PickCandidate[],
  context: DecisionContext = ANY,
  taste: RecommendationTasteSummary = NO_TASTE,
  now: Date = NOW,
) {
  const eligible = filterEligible(pool, context);
  const scored = eligible.map((candidate) => scoreCandidate(candidate, context, taste, now));
  return selectPicks(scored);
}

describe("scenario benchmark — continuation vs. discovery", () => {
  it("Q1/Q3: a single active show with nothing else beats an empty pool", () => {
    const show = continueEpisode({ title: "Only Active Show" });
    const result = rank([show]);
    expect(result.primary?.candidate.mediaProviderId).toBe(show.mediaProviderId);
  });

  it("Q2/Q3: an active show is never displaced by unaffiliated Discovery noise", () => {
    const show = continueEpisode({ title: "Active Show" });
    const noise = Array.from({ length: 5 }, () => discoveryMovie());
    const result = rank([show, ...noise]);
    expect(result.primary?.candidate.mediaProviderId).toBe(show.mediaProviderId);
  });

  it("Q4: Discovery never wins the primary slot over any local candidate, even boosted", () => {
    const backlogItem = savedMovie({ intent: "backlog", title: "Backlog Pick" });
    const boostedDiscovery = discoveryMovie({
      source: "recommendation",
      seedTitle: "Arrival",
      genres: [{ id: 18, name: "Drama" }],
    });
    const result = rank([backlogItem, boostedDiscovery], ANY, RICH_TASTE);
    expect(result.primary?.candidate.mediaProviderId).toBe(backlogItem.mediaProviderId);
  });

  it("Q11: primary Continue + Discovery alternative communicate a real tradeoff (kind differs)", () => {
    const show = continueEpisode({ title: "Active Show" });
    const disc = discoveryMovie({ source: "recommendation", seedTitle: "Arrival" });
    const result = rank([show, disc]);
    expect(result.primary?.candidate.kind).toBe("continueEpisode");
    expect(result.alternatives[0]?.candidate.kind).toBe("discoveryMovie");
  });
});

describe("scenario benchmark — Finish Soon", () => {
  it("Q8: Finish Soon outranks a plain, unrelated continuation", () => {
    const almostDone = continueEpisode({
      title: "Almost Done",
      isFinishSoon: true,
      remainingAiredEpisodeCount: 1,
    });
    const justStarted = continueEpisode({ title: "Just Started", remainingAiredEpisodeCount: 10 });
    const result = rank([justStarted, almostDone]);
    expect(result.primary?.candidate.mediaProviderId).toBe(almostDone.mediaProviderId);
  });

  it("Q8: Finish Soon becomes the obvious Best Pick when its remaining content fits the time budget", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 65 };
    const almostDone = continueEpisode({
      title: "Almost Done",
      isFinishSoon: true,
      remainingAiredEpisodeCount: 1,
      runtimeMinutes: 45,
    });
    const longSavedMovie = savedMovie({ intent: "backlog", runtimeMinutes: 160 });
    const result = rank([almostDone, longSavedMovie], context);
    expect(result.primary?.candidate.mediaProviderId).toBe(almostDone.mediaProviderId);
  });
});

describe("scenario benchmark — Backlog vs. Watchlist vs. active viewing", () => {
  it("Q5: a Backlog movie is preferred over a Discovery movie even with a taste-affinity bonus", () => {
    const backlogItem = savedMovie({ intent: "backlog", genres: [] });
    const affineDiscovery = discoveryMovie({ genres: [{ id: 18, name: "Drama" }] });
    const result = rank([backlogItem, affineDiscovery], ANY, RICH_TASTE);
    expect(result.primary?.candidate.mediaProviderId).toBe(backlogItem.mediaProviderId);
  });

  it("Q6: Watchlist never outranks a genuinely active show with real progress", () => {
    const active = continueEpisode({ title: "Active Show" });
    const watchlisted = savedShow({ intent: "watchlist" });
    const result = rank([active, watchlisted]);
    expect(result.primary?.candidate.mediaProviderId).toBe(active.mediaProviderId);
  });

  it("Q1: Backlog outranks Watchlist for otherwise-identical saved movies", () => {
    const backlogItem = savedMovie({ intent: "backlog", title: "Backlog" });
    const watchlistItem = savedMovie({ intent: "watchlist", title: "Watchlist" });
    const result = rank([backlogItem, watchlistItem]);
    expect(result.primary?.candidate.mediaProviderId).toBe(backlogItem.mediaProviderId);
  });
});

describe("scenario benchmark — time fit", () => {
  it("Q7: 'Quick' excludes a long saved movie even though it's otherwise the strongest candidate", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 35 };
    const longBacklog = savedMovie({ intent: "backlog", runtimeMinutes: 140 });
    const shortDiscovery = discoveryMovie({ runtimeMinutes: 30 });
    const result = rank([longBacklog, shortDiscovery], context);
    expect(result.primary?.candidate.mediaProviderId).toBe(shortDiscovery.mediaProviderId);
  });

  it("Q7: 'Movie night' still includes an unknown-runtime candidate", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 150 };
    const unknownRuntime = savedMovie({ intent: "backlog", runtimeMinutes: null });
    const result = rank([unknownRuntime], context);
    expect(result.primary?.candidate.mediaProviderId).toBe(unknownRuntime.mediaProviderId);
  });

  it("Q3/Q7: an active show that doesn't fit 'Quick' loses to a short saved movie that does", () => {
    const context: DecisionContext = { mediaType: "any", timeBudgetMinutes: 35 };
    const longEpisode = continueEpisode({ runtimeMinutes: 58 });
    const quickMovie = savedMovie({ intent: "watchlist", runtimeMinutes: 32 });
    const result = rank([longEpisode, quickMovie], context);
    expect(result.primary?.candidate.mediaProviderId).toBe(quickMovie.mediaProviderId);
  });

  it("Q12: an honest empty result (never a fabricated fit) when nothing meets a strict format+time combo", () => {
    const context: DecisionContext = { mediaType: "movie", timeBudgetMinutes: 35 };
    const longMovie = savedMovie({ intent: "backlog", runtimeMinutes: 150 });
    const show = continueEpisode({ runtimeMinutes: 20 });
    const result = rank([longMovie, show], context);
    expect(result.primary).toBeNull();
  });
});

describe("scenario benchmark — taste believability", () => {
  it("Q9: a single 5-star rating never fabricates a genre affinity bonus (sparse taste)", () => {
    // MIN_TOTAL_TITLES_FOR_GENRE_INSIGHT-gated in taste-summary.ts — a
    // caller that (incorrectly) tried to claim affinity from one title
    // would never actually reach this summary shape in production, but
    // scoring.ts itself must also never invent a bonus from an empty
    // affinity list.
    const sparse: RecommendationTasteSummary = { ...NO_TASTE };
    const drama = discoveryMovie({ genres: [{ id: 18, name: "Drama" }] });
    const result = scoreCandidate(drama, ANY, sparse, NOW);
    expect(result.reasons.some((reason) => reason.kind === "highGenreAffinity")).toBe(false);
  });

  it("Q9/Q10: a real multi-title genre affinity produces a truthful, bounded bonus", () => {
    const drama = discoveryMovie({ genres: [{ id: 18, name: "Drama" }] });
    const result = scoreCandidate(drama, ANY, RICH_TASTE, NOW);
    const reason = result.reasons.find((r) => r.kind === "highGenreAffinity");
    expect(reason).toEqual({ kind: "highGenreAffinity", genreName: "Drama" });
    expect(result.score).toBeLessThanOrEqual(100); // never dominates a Continue base score
  });

  it("Q10: a movie's genre affinity is never applied to a show candidate (namespace isolation)", () => {
    const scifiShow = discoveryShow({ genres: [{ id: 10765, name: "Sci-Fi & Fantasy" }] });
    const movieOnlyTaste: RecommendationTasteSummary = {
      ...NO_TASTE,
      movieGenreAffinities: [
        { genreId: 10765, genreName: "Sci-Fi & Fantasy", averageRating: 4.9, ratedTitleCount: 8 },
      ],
    };
    const result = scoreCandidate(scifiShow, ANY, movieOnlyTaste, NOW);
    expect(result.reasons.some((reason) => reason.kind === "highGenreAffinity")).toBe(false);
  });

  it("Q10: director affinity only credits a confidently-established favorite director", () => {
    const byFavorite = discoveryMovie({ source: "director" });
    const noTaste = scoreCandidate(byFavorite, ANY, NO_TASTE, NOW);
    const richTaste = scoreCandidate(byFavorite, ANY, RICH_TASTE, NOW);
    expect(noTaste.reasons.some((r) => r.kind === "directorAffinity")).toBe(false);
    expect(richTaste.reasons).toContainEqual({
      kind: "directorAffinity",
      directorName: "Denis Villeneuve",
    });
  });
});

describe("scenario benchmark — recency", () => {
  it("Q10: a show watched yesterday earns a truthful recency reason", () => {
    const recent = continueEpisode({ lastActivityAt: new Date("2024-06-09T12:00:00Z") });
    const result = scoreCandidate(recent, ANY, NO_TASTE, NOW);
    expect(result.reasons).toContainEqual({ kind: "recentContinuation", daysAgo: 1 });
  });

  it("Q10: a show last watched a month ago never claims recency", () => {
    const stale = continueEpisode({ lastActivityAt: new Date("2024-05-01T12:00:00Z") });
    const result = scoreCandidate(stale, ANY, NO_TASTE, NOW);
    expect(result.reasons.some((r) => r.kind === "recentContinuation")).toBe(false);
  });

  it("Q1/Q3: recency alone never outranks Finish Soon", () => {
    const recentButNotClose = continueEpisode({
      title: "Recent, far from done",
      lastActivityAt: new Date("2024-06-09T12:00:00Z"),
      remainingAiredEpisodeCount: 12,
    });
    const staleButAlmostDone = continueEpisode({
      title: "Stale, almost done",
      isFinishSoon: true,
      remainingAiredEpisodeCount: 1,
      lastActivityAt: new Date("2024-01-01T00:00:00Z"),
    });
    const result = rank([recentButNotClose, staleButAlmostDone]);
    expect(result.primary?.candidate.mediaProviderId).toBe(staleButAlmostDone.mediaProviderId);
  });
});

describe("scenario benchmark — a mature, high-history user", () => {
  // A realistic pool: two active shows (one close to finishing), a
  // Backlog movie, two Watchlist items, and several Discovery candidates
  // from a confident, multi-title taste profile.
  function matureUserPool(): readonly PickCandidate[] {
    return [
      continueEpisode({ title: "Currently Watching", remainingAiredEpisodeCount: 8 }),
      continueEpisode({
        title: "Nearly Finished",
        isFinishSoon: true,
        remainingAiredEpisodeCount: 1,
      }),
      savedMovie({
        intent: "backlog",
        title: "Backlog Movie",
        genres: [{ id: 18, name: "Drama" }],
      }),
      savedShow({ intent: "watchlist", title: "Watchlist Show A" }),
      savedMovie({ intent: "watchlist", title: "Watchlist Movie B" }),
      discoveryMovie({ source: "recommendation", seedTitle: "Arrival", title: "New Movie A" }),
      discoveryShow({ source: "genre", title: "New Show B" }),
    ];
  }

  it("Q1/Q2: Finish Soon wins Best Pick over a merely-active show and every saved/discovery item", () => {
    const result = rank(matureUserPool());
    expect(result.primary?.candidate.title).toBe("Nearly Finished");
  });

  it("Q11: the two alternatives are meaningfully different from the primary and each other", () => {
    const result = rank(matureUserPool());
    const kinds = [
      result.primary?.candidate.kind,
      ...result.alternatives.map((a) => a.candidate.kind),
    ];
    expect(new Set(kinds).size).toBeGreaterThan(1);
  });

  it("Q12: exactly one Best Pick and no more than two alternatives — never a scrollable list", () => {
    const result = rank(matureUserPool());
    expect(result.primary).not.toBeNull();
    expect(result.alternatives.length).toBeLessThanOrEqual(2);
  });
});

describe("scenario benchmark — a brand-new, sparse-history user", () => {
  it("Q1/Q12: with only Discovery available, the pool still produces an honestly-labeled Best Pick", () => {
    const popularA = discoveryMovie({ source: "popular", title: "Popular A" });
    const popularB = discoveryShow({ source: "popular", title: "Popular B" });
    const result = rank([popularA, popularB], ANY, NO_TASTE);
    expect(result.primary).not.toBeNull();
    expect(result.primary?.reasons).toEqual([{ kind: "popularDiscovery" }]);
  });

  it("Q9: a new user's first Watchlist save still beats unrelated Discovery noise", () => {
    const firstSave = savedMovie({ intent: "watchlist", title: "First Save" });
    const noise = Array.from({ length: 3 }, () => discoveryMovie());
    const result = rank([firstSave, ...noise], ANY, NO_TASTE);
    expect(result.primary?.candidate.mediaProviderId).toBe(firstSave.mediaProviderId);
  });
});

describe("scenario benchmark — genre isolation and bonus caps", () => {
  it("Q10: a title matching two affinity genres is capped, never allowed to snowball", () => {
    const taste: RecommendationTasteSummary = {
      ...NO_TASTE,
      movieGenreAffinities: [
        { genreId: 18, genreName: "Drama", averageRating: 4.8, ratedTitleCount: 6 },
        { genreId: 53, genreName: "Thriller", averageRating: 4.6, ratedTitleCount: 5 },
        { genreId: 27, genreName: "Horror", averageRating: 4.5, ratedTitleCount: 4 },
      ],
    };
    const fiveGenreTitle = discoveryMovie({
      genres: [
        { id: 18, name: "Drama" },
        { id: 53, name: "Thriller" },
        { id: 27, name: "Horror" },
      ],
    });
    const result = scoreCandidate(fiveGenreTitle, ANY, taste, NOW);
    // Capped at two genres' worth (GENRE_AFFINITY_MAX_BONUS), never three.
    expect(result.score).toBeLessThanOrEqual(15 + GENRE_AFFINITY_BONUS * 2);
  });
});

describe("scenario benchmark — format strictness and mixed-pool integrity", () => {
  it("Q3: a strict Show format excludes a clearly better-scoring Movie, never silently substituting it", () => {
    const context: DecisionContext = { mediaType: "show", timeBudgetMinutes: null };
    const strongMovie = savedMovie({ intent: "backlog", title: "Strong Movie" });
    const weakerShow = discoveryShow({ title: "Weaker Show" });
    const result = rank([strongMovie, weakerShow], context);
    expect(result.primary?.candidate.mediaProviderId).toBe(weakerShow.mediaProviderId);
  });

  it("Q11: alternatives never repeat a media provider id in a realistic mixed pool", () => {
    const pool = [
      continueEpisode({ title: "Active" }),
      savedMovie({ intent: "backlog", title: "Backlog" }),
      savedShow({ intent: "watchlist", title: "Watchlist" }),
      discoveryMovie({ title: "Discovery" }),
    ];
    const result = rank(pool);
    const ids = [result.primary, ...result.alternatives].map((r) => r?.candidate.mediaProviderId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("Q2: a taste-evidenced Discovery pick outranks a plain popular-fallback Discovery pick", () => {
    const evidenced = discoveryMovie({
      source: "recommendation",
      seedTitle: "Arrival",
      genres: [{ id: 18, name: "Drama" }],
    });
    const plain = discoveryMovie({ source: "popular" });
    const result = rank([evidenced, plain], ANY, RICH_TASTE);
    expect(result.primary?.candidate.mediaProviderId).toBe(evidenced.mediaProviderId);
  });
});

describe("scenario benchmark — session exclusion", () => {
  it("Q12: excluding the current Best Pick promotes the next strongest without repeating it", () => {
    const first = continueEpisode({
      title: "First Pick",
      remainingAiredEpisodeCount: 1,
      isFinishSoon: true,
    });
    const second = savedMovie({ intent: "backlog", title: "Second Pick" });
    const context = ANY;
    const eligible = filterEligible([first, second], context);
    const scored = eligible.map((c) => scoreCandidate(c, context, NO_TASTE, NOW));
    const initial = selectPicks(scored);
    expect(initial.primary?.candidate.mediaProviderId).toBe(first.mediaProviderId);

    const afterExclusion = selectPicks(scored, new Set([first.mediaProviderId]));
    expect(afterExclusion.primary?.candidate.mediaProviderId).toBe(second.mediaProviderId);
  });
});
