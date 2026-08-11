import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MovieDetails } from "@/server/media/types";
import type { LibraryCandidate } from "./candidates";

vi.mock("server-only", () => ({}));

const getMovieDetails = vi.fn();
const getShowDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
}));

const listLibrarySearchCandidates = vi.fn();
vi.mock("./candidates", () => ({
  listLibrarySearchCandidates: (...args: unknown[]) => listLibrarySearchCandidates(...args),
}));

// `search.ts` composes matched items via the real `composeLibraryItems` —
// stub it to a lightweight pass-through so this stays a unit test of
// search's own matching/ranking, not a second copy of compose.test.ts.
const composeLibraryItems = vi.fn();
vi.mock("./compose", () => ({
  composeLibraryItems: (...args: unknown[]) => composeLibraryItems(...args),
}));

const { searchLibrary } = await import("./search");

function movieCandidate(id: number, activityDaysAgo = 0): LibraryCandidate {
  return {
    kind: "planned-movie",
    mediaType: "movie",
    mediaProviderId: id,
    intent: "watchlist",
    trackingStatus: null,
    watchCount: null,
    personalActivityAt: new Date(Date.now() - activityDaysAgo * 86_400_000),
    addedAt: new Date(Date.now() - activityDaysAgo * 86_400_000),
  };
}

function movie(id: number, title: string, originalTitle = title): MovieDetails {
  return {
    id,
    mediaType: "movie",
    title,
    originalTitle,
    overview: null,
    tagline: null,
    status: "Released",
    genres: [],
    poster: null,
    backdrop: null,
    providerRating: 7,
    voteCount: 10,
    originalLanguage: "en",
    releaseDate: "2020-01-01",
    releaseYear: 2020,
    runtimeMinutes: 100,
    productionCountries: [],
    collection: null,
  };
}

describe("searchLibrary", () => {
  beforeEach(() => {
    getMovieDetails.mockReset();
    getShowDetails.mockReset();
    listLibrarySearchCandidates.mockReset();
    composeLibraryItems.mockReset();
    // The real function's actual shape doesn't matter here — search only
    // cares about which candidates it decides to pass through.
    composeLibraryItems.mockImplementation((_userId: string, candidates: LibraryCandidate[]) =>
      Promise.resolve(
        candidates.map((candidate) => ({ mediaProviderId: candidate.mediaProviderId })),
      ),
    );
  });

  it("matches a title substring, case-insensitively", async () => {
    listLibrarySearchCandidates.mockResolvedValue([movieCandidate(550)]);
    getMovieDetails.mockResolvedValue(movie(550, "Fight Club"));

    const result = await searchLibrary({ userId: "u1", query: "fight", count: 24 });

    expect(result.items).toEqual([{ mediaProviderId: 550 }]);
  });

  it("matches on original title even when the display title differs", async () => {
    listLibrarySearchCandidates.mockResolvedValue([movieCandidate(372058)]);
    getMovieDetails.mockResolvedValue(movie(372058, "Your Name.", "Kimi no Na wa."));

    const result = await searchLibrary({ userId: "u1", query: "kimi", count: 24 });

    expect(result.items).toEqual([{ mediaProviderId: 372058 }]);
  });

  it("returns nothing when no title matches", async () => {
    listLibrarySearchCandidates.mockResolvedValue([movieCandidate(550)]);
    getMovieDetails.mockResolvedValue(movie(550, "Fight Club"));

    const result = await searchLibrary({ userId: "u1", query: "dune", count: 24 });

    expect(result.items).toEqual([]);
    expect(result.hasMore).toBe(false);
  });

  it("ranks a title that starts with the query above one that merely contains it", async () => {
    listLibrarySearchCandidates.mockResolvedValue([movieCandidate(1), movieCandidate(2)]);
    getMovieDetails.mockImplementation((id: number) =>
      Promise.resolve(id === 1 ? movie(1, "The Matrix") : movie(2, "Matrix Reloaded")),
    );

    await searchLibrary({ userId: "u1", query: "matrix", count: 24 });

    const [, passedCandidates] = composeLibraryItems.mock.calls[0] as [string, LibraryCandidate[]];
    expect(passedCandidates.map((candidate) => candidate.mediaProviderId)).toEqual([2, 1]);
  });

  it("skips (never crashes on) a title whose provider hydration fails", async () => {
    listLibrarySearchCandidates.mockResolvedValue([movieCandidate(550), movieCandidate(551)]);
    getMovieDetails.mockImplementation((id: number) =>
      id === 550
        ? Promise.reject(new Error("TMDB 404"))
        : Promise.resolve(movie(551, "Fight Club 2")),
    );

    const result = await searchLibrary({ userId: "u1", query: "fight", count: 24 });

    expect(result.items).toEqual([{ mediaProviderId: 551 }]);
  });

  it("reports hasMore once matches exceed the requested count", async () => {
    listLibrarySearchCandidates.mockResolvedValue([
      movieCandidate(1),
      movieCandidate(2),
      movieCandidate(3),
    ]);
    getMovieDetails.mockImplementation((id: number) => Promise.resolve(movie(id, "Fight Club")));

    const result = await searchLibrary({ userId: "u1", query: "fight", count: 2 });

    expect(result.hasMore).toBe(true);
    expect(composeLibraryItems.mock.calls[0]?.[1]).toHaveLength(2);
  });
});
