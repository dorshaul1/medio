import "server-only";
import { requireSession } from "@/server/auth/session";
import { setMediaRating } from "@/server/opinions/ratings";
import { addToBacklog, addToWatchlist } from "@/server/planning/planning-items";
import { getSeasonDetails } from "@/server/tmdb/queries";
import { recordEpisodeWatch } from "@/server/tracking/episode-events";
import { recordMovieWatch } from "@/server/tracking/movie-events";
import { assertDeveloperToolsEnabled } from "./guard";

// A curated, real (not fabricated) set of well-known TMDB titles — real
// provider IDs, so every mocked title actually resolves to real artwork/
// metadata the same way a genuine watch would. Every mutation below goes
// through the exact same domain functions (`recordMovieWatch`,
// `recordEpisodeWatch`, `setMediaRating`, `addToWatchlist`/
// `addToBacklog`) a real user action would call — this is realistic
// seed data, not a parallel shortcut into the database. See
// docs/settings.md, "Developer tools".

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

// `watches`: one entry per real viewing event (days ago) — more than one
// entry means a rewatch, exactly like a real user watching it twice.
const MOCK_MOVIES: readonly { id: number; rating?: number; watches: readonly number[] }[] = [
  { id: 550, rating: 5, watches: [420, 20] }, // Fight Club — rewatched
  { id: 155, rating: 5, watches: [300] }, // The Dark Knight
  { id: 27205, rating: 5, watches: [250] }, // Inception
  { id: 13, rating: 4, watches: [200] }, // Forrest Gump
  { id: 680, rating: 4, watches: [180] }, // Pulp Fiction
  { id: 372058, rating: 4, watches: [150] }, // Your Name.
  { id: 118340, rating: 3, watches: [120] }, // Guardians of the Galaxy
  { id: 24428, rating: 3, watches: [100] }, // The Avengers
  { id: 603, watches: [60] }, // The Matrix — unrated, on purpose
  { id: 278, rating: 5, watches: [520, 380, 30] }, // The Shawshank Redemption — heavily rewatched
];

// One real season per show — episodes come from a live TMDB fetch so
// `episodeProviderId` always matches what the real Season page renders;
// a fabricated id would silently desync watch state from real episodes.
const MOCK_SHOWS: readonly {
  showId: number;
  seasonNumber: number;
  rating?: number;
  episodeCount: number;
  rewatchFirstEpisode?: boolean;
}[] = [
  { showId: 1396, seasonNumber: 1, rating: 5, episodeCount: 7, rewatchFirstEpisode: true }, // Breaking Bad S1
  { showId: 1399, seasonNumber: 1, rating: 4, episodeCount: 4 }, // Game of Thrones S1
  { showId: 60625, seasonNumber: 1, episodeCount: 2 }, // Rick and Morty S1 — unrated
];

const MOCK_WATCHLIST_MOVIE_IDS: readonly number[] = [244786]; // Whiplash
const MOCK_BACKLOG_MOVIE_IDS: readonly number[] = [496243]; // Parasite

export type MockDataResult = {
  movieEventsCreated: number;
  episodeEventsCreated: number;
  showsSeeded: number;
  // Shows whose real season data couldn't be fetched (e.g. TMDB
  // unreachable) — movies/ratings/planning still seed regardless, so one
  // failed show never blocks the rest.
  showsFailed: readonly number[];
  planningItemsCreated: number;
};

export async function seedMockData(): Promise<MockDataResult> {
  assertDeveloperToolsEnabled();
  await requireSession();

  let movieEventsCreated = 0;
  for (const movie of MOCK_MOVIES) {
    for (const daysAgoOffset of movie.watches) {
      await recordMovieWatch({ movieProviderId: movie.id, watchedAt: daysAgo(daysAgoOffset) });
      movieEventsCreated++;
    }
    if (movie.rating !== undefined) {
      await setMediaRating({ mediaType: "movie", mediaProviderId: movie.id, rating: movie.rating });
    }
  }

  let episodeEventsCreated = 0;
  let showsSeeded = 0;
  const showsFailed: number[] = [];
  for (const show of MOCK_SHOWS) {
    try {
      const season = await getSeasonDetails(show.showId, show.seasonNumber);
      const episodes = season.episodes.slice(0, show.episodeCount);

      for (const [index, episode] of episodes.entries()) {
        await recordEpisodeWatch({
          showProviderId: show.showId,
          seasonNumber: show.seasonNumber,
          episodeNumber: episode.episodeNumber,
          episodeProviderId: episode.id,
          watchedAt: daysAgo((episodes.length - index) * 4),
        });
        episodeEventsCreated++;
      }

      const firstEpisode = episodes[0];
      if (show.rewatchFirstEpisode && firstEpisode) {
        await recordEpisodeWatch({
          showProviderId: show.showId,
          seasonNumber: show.seasonNumber,
          episodeNumber: firstEpisode.episodeNumber,
          episodeProviderId: firstEpisode.id,
          watchedAt: daysAgo(5),
        });
        episodeEventsCreated++;
      }

      if (show.rating !== undefined) {
        await setMediaRating({
          mediaType: "show",
          mediaProviderId: show.showId,
          rating: show.rating,
        });
      }
      showsSeeded++;
    } catch {
      showsFailed.push(show.showId);
    }
  }

  let planningItemsCreated = 0;
  for (const id of MOCK_WATCHLIST_MOVIE_IDS) {
    await addToWatchlist("movie", id);
    planningItemsCreated++;
  }
  for (const id of MOCK_BACKLOG_MOVIE_IDS) {
    await addToBacklog("movie", id);
    planningItemsCreated++;
  }

  return {
    movieEventsCreated,
    episodeEventsCreated,
    showsSeeded,
    showsFailed,
    planningItemsCreated,
  };
}
