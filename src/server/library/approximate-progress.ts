import type { SeasonSummary } from "@/server/media/types";

// Library-scale approximation of "episodes aired so far" — deliberately
// less precise than Show Details' own per-episode computation (see
// `server/tracking/progress.ts`), because matching that precision for
// every show visible on a Library page would mean fetching every season
// of every one of them — exactly the N×season provider fan-out this
// application's architecture forbids (see docs/architecture.md, "Show
// Details never eagerly fetches every season's episodes"). Uses only the
// one `ShowDetails` fetch Library composition already needs for
// title/poster: a season counts as fully aired once its own air date (its
// first episode's air date) has passed, excluding Specials (season 0).
// The one imprecision this accepts: a season that started airing but
// hasn't finished counts as fully aired a few episodes early. That's
// acceptable for Library-scale state classification (Watching vs. Caught
// up vs. Completed) — Show Details remains the source of exact progress.
export function approximateAiredEpisodeCount(seasons: readonly SeasonSummary[]): number {
  const now = Date.now();

  return seasons
    .filter((season) => season.seasonNumber !== 0)
    .filter(
      (season) =>
        season.airDate !== null && new Date(`${season.airDate}T00:00:00Z`).getTime() <= now,
    )
    .reduce((total, season) => total + season.episodeCount, 0);
}
