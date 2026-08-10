import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Episode, MovieDetails, SeasonDetails, ShowDetails } from "@/server/media/types";
import type { DiaryEvent } from "./types";

vi.mock("server-only", () => ({}));

const getMovieDetails = vi.fn();
const getShowDetails = vi.fn();
const getSeasonDetails = vi.fn();
vi.mock("@/server/tmdb/queries", () => ({
  getMovieDetails: (...args: unknown[]) => getMovieDetails(...args),
  getShowDetails: (...args: unknown[]) => getShowDetails(...args),
  getSeasonDetails: (...args: unknown[]) => getSeasonDetails(...args),
}));

const { hydrateDiaryEvents } = await import("./hydrate");

function movie(overrides: Partial<MovieDetails> = {}): MovieDetails {
  return {
    id: 550,
    mediaType: "movie",
    title: "Fight Club",
    originalTitle: "Fight Club",
    overview: null,
    tagline: null,
    status: "Released",
    genres: [],
    poster: null,
    backdrop: null,
    providerRating: 8.4,
    voteCount: 100,
    originalLanguage: "en",
    releaseDate: "1999-10-15",
    releaseYear: 1999,
    runtimeMinutes: 139,
    productionCountries: [],
    collection: null,
    ...overrides,
  };
}

function show(overrides: Partial<ShowDetails> = {}): ShowDetails {
  return {
    id: 1399,
    mediaType: "show",
    title: "Winter's Watch",
    originalTitle: "Winter's Watch",
    overview: null,
    tagline: null,
    status: "Ended",
    genres: [],
    poster: null,
    backdrop: null,
    providerRating: 8.5,
    voteCount: 100,
    originalLanguage: "en",
    firstAirDate: "2011-04-17",
    firstAirYear: 2011,
    lastAirDate: "2019-05-19",
    numberOfSeasons: 1,
    numberOfEpisodes: 2,
    episodeRuntimeMinutes: 55,
    seasons: [],
    creators: [],
    nextEpisodeToAir: null,
    lastEpisodeToAir: null,
    ...overrides,
  };
}

function episode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 63056,
    episodeNumber: 1,
    seasonNumber: 1,
    title: "Winter Is Coming",
    overview: null,
    runtimeMinutes: 62,
    airDate: "2011-04-17",
    still: null,
    providerRating: 8.1,
    ...overrides,
  };
}

function season(overrides: Partial<SeasonDetails> = {}): SeasonDetails {
  return {
    showId: 1399,
    id: 3625,
    seasonNumber: 1,
    title: "Season 1",
    overview: null,
    airDate: "2011-04-17",
    poster: null,
    episodes: [episode()],
    ...overrides,
  };
}

function movieEvent(
  overrides: Partial<Extract<DiaryEvent, { eventType: "movie" }>> = {},
): DiaryEvent {
  return {
    eventType: "movie",
    id: "event-1",
    movieProviderId: 550,
    watchedAt: new Date("2024-01-01"),
    ordinal: 1,
    ...overrides,
  };
}

function episodeEvent(
  overrides: Partial<Extract<DiaryEvent, { eventType: "episode" }>> = {},
): DiaryEvent {
  return {
    eventType: "episode",
    id: "event-2",
    showProviderId: 1399,
    seasonNumber: 1,
    episodeNumber: 1,
    episodeProviderId: 63056,
    watchedAt: new Date("2024-01-02"),
    ordinal: 1,
    ...overrides,
  };
}

describe("hydrateDiaryEvents", () => {
  beforeEach(() => {
    getMovieDetails.mockReset();
    getShowDetails.mockReset();
    getSeasonDetails.mockReset();
  });

  it("hydrates a movie event into a MovieDiaryEntry", async () => {
    getMovieDetails.mockResolvedValue(movie());

    const [entry] = await hydrateDiaryEvents([movieEvent()]);

    expect(entry).toMatchObject({ kind: "movie", title: "Fight Club", year: 1999 });
  });

  it("hydrates an episode event into an EpisodeDiaryEntry with both show and episode identity", async () => {
    getShowDetails.mockResolvedValue(show());
    getSeasonDetails.mockResolvedValue(season());

    const [entry] = await hydrateDiaryEvents([episodeEvent()]);

    expect(entry).toMatchObject({
      kind: "episode",
      showTitle: "Winter's Watch",
      episodeTitle: "Winter Is Coming",
      seasonNumber: 1,
      episodeNumber: 1,
    });
  });

  it("fetches each distinct movie exactly once, even across rewatches", async () => {
    getMovieDetails.mockResolvedValue(movie());

    await hydrateDiaryEvents([
      movieEvent({ id: "a", watchedAt: new Date("2024-01-01"), ordinal: 1 }),
      movieEvent({ id: "b", watchedAt: new Date("2024-05-01"), ordinal: 2 }),
      movieEvent({ id: "c", watchedAt: new Date("2024-08-01"), ordinal: 3 }),
    ]);

    expect(getMovieDetails).toHaveBeenCalledTimes(1);
    expect(getMovieDetails).toHaveBeenCalledWith(550);
  });

  it("fetches one Season for every episode entry in that season, never per-episode", async () => {
    getShowDetails.mockResolvedValue(show());
    getSeasonDetails.mockResolvedValue(
      season({
        episodes: [
          episode({ id: 63056, episodeNumber: 1 }),
          episode({ id: 63057, episodeNumber: 2 }),
        ],
      }),
    );

    const entries = await hydrateDiaryEvents([
      episodeEvent({ id: "a", episodeProviderId: 63056, episodeNumber: 1 }),
      episodeEvent({ id: "b", episodeProviderId: 63057, episodeNumber: 2 }),
      episodeEvent({ id: "c", episodeProviderId: 63056, episodeNumber: 1 }), // a rewatch
    ]);

    expect(getSeasonDetails).toHaveBeenCalledTimes(1);
    expect(getShowDetails).toHaveBeenCalledTimes(1);
    expect(entries.every((entry) => entry.kind === "episode")).toBe(true);
  });

  it("a movie hydration failure degrades to an unavailable entry without breaking other entries", async () => {
    getMovieDetails.mockImplementation((id: number) =>
      id === 550 ? Promise.resolve(movie()) : Promise.reject(new Error("TMDB unavailable")),
    );

    const entries = await hydrateDiaryEvents([
      movieEvent({ id: "a", movieProviderId: 550 }),
      movieEvent({ id: "b", movieProviderId: 999 }),
    ]);

    const [ok, failed] = entries;
    expect(ok?.kind).toBe("movie");
    expect(failed).toMatchObject({
      kind: "unavailable",
      eventType: "movie",
      id: "b",
      // The event's real identity is preserved even when hydration
      // fails — Edit/Delete still need it — never dropped, never
      // fabricated a title.
      movieProviderId: 999,
    });
    expect(failed?.watchedAt).toBeInstanceOf(Date);
  });

  it("an episode hydration failure degrades to an unavailable entry, never a fabricated title", async () => {
    getShowDetails.mockRejectedValue(new Error("TMDB unavailable"));

    const [entry] = await hydrateDiaryEvents([episodeEvent()]);

    expect(entry).toMatchObject({ kind: "unavailable", eventType: "episode" });
  });

  it("a season with no matching episode id degrades to unavailable rather than guessing", async () => {
    getShowDetails.mockResolvedValue(show());
    getSeasonDetails.mockResolvedValue(season({ episodes: [episode({ id: 999999 })] }));

    const [entry] = await hydrateDiaryEvents([episodeEvent({ episodeProviderId: 63056 })]);

    expect(entry).toMatchObject({ kind: "unavailable", eventType: "episode" });
  });

  it("preserves ordinal and watchedAt through hydration", async () => {
    getMovieDetails.mockResolvedValue(movie());
    const watchedAt = new Date("2024-03-15");

    const [entry] = await hydrateDiaryEvents([movieEvent({ watchedAt, ordinal: 3 })]);

    expect(entry?.watchedAt).toEqual(watchedAt);
    expect(entry?.ordinal).toBe(3);
  });
});
