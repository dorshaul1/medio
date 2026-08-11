import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaSummary, PersonSummary } from "@/server/media/types";

vi.mock("server-only", () => ({}));

const searchMovies = vi.fn();
const searchShows = vi.fn();
const searchPeople = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  searchMovies: (...args: unknown[]) => searchMovies(...args),
  searchShows: (...args: unknown[]) => searchShows(...args),
  searchPeople: (...args: unknown[]) => searchPeople(...args),
}));

const getPersonalStates = vi.fn();
vi.mock("@/server/media/personal-state", () => ({
  getPersonalStates: (...args: unknown[]) => getPersonalStates(...args),
}));

const { searchAll } = await import("./compose");

function movie(overrides: Partial<MediaSummary> = {}): MediaSummary {
  return {
    mediaType: "movie",
    id: 550,
    title: "Fight Club",
    originalTitle: "Fight Club",
    overview: null,
    releaseDate: "1999-10-15",
    releaseYear: 1999,
    poster: null,
    backdrop: null,
    providerRating: 8.4,
    voteCount: 26000,
    genreIds: [],
    adult: false,
    ...overrides,
  } as MediaSummary;
}

function show(overrides: Partial<MediaSummary> = {}): MediaSummary {
  return {
    mediaType: "show",
    id: 1399,
    title: "Dark",
    originalTitle: "Dark",
    overview: null,
    releaseDate: "2017-12-01",
    releaseYear: 2017,
    poster: null,
    backdrop: null,
    providerRating: 8.5,
    voteCount: 5000,
    genreIds: [],
    adult: false,
    ...overrides,
  } as MediaSummary;
}

function person(overrides: Partial<PersonSummary> = {}): PersonSummary {
  return {
    id: 525,
    name: "Christopher Nolan",
    profile: null,
    knownForDepartment: "Directing",
    popularity: 20,
    knownFor: [],
    ...overrides,
  };
}

function pagination<T>(items: readonly T[]) {
  return { page: 1, totalPages: 1, totalResults: items.length, items };
}

describe("searchAll", () => {
  beforeEach(() => {
    searchMovies.mockReset();
    searchShows.mockReset();
    searchPeople.mockReset();
    getPersonalStates.mockReset().mockResolvedValue(new Map());
  });

  it("ranks Movies, Shows, and People together into one flat list", async () => {
    searchMovies.mockResolvedValue(pagination([movie({ id: 1, title: "Dark Waters" })]));
    searchShows.mockResolvedValue(pagination([show({ id: 2, title: "Dark" })]));
    searchPeople.mockResolvedValue(pagination([]));

    const result = await searchAll("Dark", 10);

    expect(result.results.map((r) => r.kind)).toEqual(["show", "movie"]);
  });

  it("composes personal state only for Movie/Show candidates, never People", async () => {
    searchMovies.mockResolvedValue(pagination([movie()]));
    searchShows.mockResolvedValue(pagination([]));
    searchPeople.mockResolvedValue(pagination([person({ name: "Fight Club Guy" })]));
    getPersonalStates.mockResolvedValue(new Map([["movie:550", { kind: "watchlist" }]]));

    const result = await searchAll("Fight Club", 10);

    const [batchedItems] = getPersonalStates.mock.calls[0] as [{ mediaType: string }[]];
    expect(batchedItems).toEqual([{ mediaType: "movie", mediaProviderId: 550 }]);

    const movieResult = result.results.find((r) => r.kind === "movie");
    expect(movieResult).toMatchObject({ kind: "movie", personalState: { kind: "watchlist" } });
  });

  it("keeps a type's own failure independent — one type failing doesn't hide the others", async () => {
    searchMovies.mockResolvedValue(pagination([movie()]));
    searchShows.mockRejectedValue(new Error("TMDB unavailable"));
    searchPeople.mockResolvedValue(pagination([]));

    const result = await searchAll("Fight Club", 10);

    expect(result.failedTypes).toEqual(["shows"]);
    expect(result.results).toHaveLength(1);
  });

  it("reports hasMore once the ranked set exceeds the requested limit", async () => {
    searchMovies.mockResolvedValue(
      pagination([
        movie({ id: 1, title: "Dark" }),
        movie({ id: 2, title: "Dark Waters" }),
        movie({ id: 3, title: "Dark Shadows" }),
      ]),
    );
    searchShows.mockResolvedValue(pagination([]));
    searchPeople.mockResolvedValue(pagination([]));

    const result = await searchAll("Dark", 2);

    expect(result.results).toHaveLength(2);
    expect(result.hasMore).toBe(true);
  });

  it("respects an explicit type filter — skips the other providers entirely", async () => {
    searchMovies.mockResolvedValue(pagination([movie()]));
    searchShows.mockResolvedValue(pagination([]));
    searchPeople.mockResolvedValue(pagination([]));

    await searchAll("Fight Club", 10, "movies");

    expect(searchShows).not.toHaveBeenCalled();
    expect(searchPeople).not.toHaveBeenCalled();
  });
});
