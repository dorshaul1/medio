import type { SeasonSummary } from "@/server/media/types";

// Regular seasons ascend by season number — season structure has a
// canonical order, never popularity/air-date sorting. Season 0
// ("Specials" — see docs/media-provider.md) moves to the end rather than
// sorting first, since TMDB returns it first numerically but it isn't the
// show's actual first season, and a Specials season is normally a
// secondary, not primary, position. Seasons with zero episodes are
// dropped — the one conservative "obviously unusable" case: there's
// nothing to browse into. A Specials season with real episodes is kept.
export function sortSeasons(seasons: readonly SeasonSummary[]): readonly SeasonSummary[] {
  const withEpisodes = seasons.filter((season) => season.episodeCount > 0);
  const regular = withEpisodes
    .filter((season) => season.seasonNumber !== 0)
    .sort((a, b) => a.seasonNumber - b.seasonNumber);
  const specials = withEpisodes.filter((season) => season.seasonNumber === 0);

  return [...regular, ...specials];
}
