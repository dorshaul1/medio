// A small, centralized set of deterministic demo media for every Landing
// illustration — see CLAUDE.md, "Landing". Never real provider artwork
// (no franchise-association risk, no attribution requirement, nothing
// that depends on a network request) and never real user data — every
// illustration on the public Landing page is built entirely from this
// file, so there's exactly one place fictional titles/numbers live
// rather than scattered magic strings across components.
export const DEMO_SHOW_CURRENT = {
  title: "Harbor Lights",
  season: 2,
  lastWatchedEpisode: 6,
  nextEpisode: 7,
  seasonEpisodeCount: 8,
} as const;

export const DEMO_SHOW_FINISHING = {
  title: "Nightfall County",
  season: 3,
  nextEpisode: 8,
  remainingEpisodes: 1,
} as const;

export const DEMO_SHOW_UPCOMING = {
  title: "Midnight Exchange",
  releaseLabel: "Season premiere",
} as const;

export const DEMO_MOVIE_BACKLOG = { title: "Paper Moons" } as const;
export const DEMO_MOVIE_WATCHLIST = { title: "Low Tide" } as const;
export const DEMO_MOVIE_RELEASE = { title: "The Quiet Hour", releaseLabel: "New release" } as const;
export const DEMO_SHOW_WATCHING = { title: "The Long Season" } as const;
