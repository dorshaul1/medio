// Application-owned Pick ("What should I watch?") domain models — see
// docs/recommendations.md. `PickCandidate` is a discriminated union by
// design: a show one episode away from an active continuation, a saved
// Watchlist/Backlog item, and a fresh discovery pick are genuinely
// different kinds of fact, not the same shape with optional fields.
import type { Genre, MediaImage } from "@/server/media/types";
import type { PlanningIntent } from "@/server/planning/types";
import type { GenreExposureStat } from "@/server/stats/types";

export type PickMediaType = "movie" | "show";

// Session-only decision context — never persisted (see
// docs/recommendations.md, "Session-only context"). `mediaType: "any"`
// and `timeBudgetMinutes: null` both mean "no preference", not a filter
// value that happens to match everything. The three tiers are named,
// human presets (see constants.ts, "Time presets") — never a raw minute
// slider.
export type DecisionContext = {
  mediaType: "any" | PickMediaType;
  timeBudgetMinutes: null | 35 | 65 | 150;
};

// --- Reason facts -----------------------------------------------------
//
// A structured fact about *why* a candidate was recommended — never a
// raw string (see docs/recommendations.md, "Reason facts"). Converted to
// copy only at the presentation layer (features/pick/reason-copy.ts),
// mirroring the existing `diary-ordinal.ts` precedent.
export type ReasonFact =
  | { kind: "continueActiveShow" }
  | { kind: "recentContinuation"; daysAgo: number }
  | { kind: "finishSoon"; remainingEpisodes: number }
  | { kind: "backlogIntent" }
  | { kind: "watchlistIntent" }
  | { kind: "highGenreAffinity"; genreName: string }
  | { kind: "directorAffinity"; directorName: string }
  | { kind: "timeFit"; minutes: number }
  | { kind: "similarToWatched"; title: string }
  | { kind: "popularDiscovery" };

// --- Candidates ---------------------------------------------------------

type PickCandidateCommon = {
  mediaProviderId: number;
  title: string;
  poster: MediaImage | null;
  backdrop: MediaImage | null;
  year: number | null;
  genres: readonly Genre[];
  // Null means unknown — never assumed to be 0 (see eligibility.ts, which
  // treats "unknown" and "too long" as different facts).
  runtimeMinutes: number | null;
};

export type ContinueEpisodeCandidate = PickCandidateCommon & {
  kind: "continueEpisode";
  mediaType: "show";
  remainingAiredEpisodeCount: number;
  // Already classified by Home's own `classifyActiveShows` — Pick never
  // re-derives Finish Soon eligibility itself (see
  // docs/recommendations.md, "Continue pool").
  isFinishSoon: boolean;
  // Reused from Home's own `ActiveShowContinuation.lastActivityAt` —
  // drives the `recentContinuation` reason (see scoring.ts). Never
  // re-derived independently; Pick has no other source of truth for it.
  lastActivityAt: Date;
  nextEpisode: {
    seasonNumber: number;
    episodeNumber: number;
    episodeProviderId: number;
  };
};

export type SavedMovieCandidate = PickCandidateCommon & {
  kind: "savedMovie";
  mediaType: "movie";
  intent: PlanningIntent;
};

export type SavedShowCandidate = PickCandidateCommon & {
  kind: "savedShow";
  mediaType: "show";
  intent: PlanningIntent;
};

export type DiscoverySource = "recommendation" | "director" | "genre" | "popular";

export type DiscoveryMovieCandidate = PickCandidateCommon & {
  kind: "discoveryMovie";
  mediaType: "movie";
  source: DiscoverySource;
  // Only populated for `source: "recommendation"` — the watched title
  // this candidate was recommended from, so the reason can name it (see
  // scoring.ts, "similarToWatched").
  seedTitle: string | null;
};

export type DiscoveryShowCandidate = PickCandidateCommon & {
  kind: "discoveryShow";
  mediaType: "show";
  // Shows have no director-credit discovery source (see
  // docs/recommendations.md, "Deferred: actor/director discovery for
  // shows") — the type still excludes "director" to keep that honest.
  source: Exclude<DiscoverySource, "director">;
  seedTitle: string | null;
};

export type PickCandidate =
  | ContinueEpisodeCandidate
  | SavedMovieCandidate
  | SavedShowCandidate
  | DiscoveryMovieCandidate
  | DiscoveryShowCandidate;

// --- Scored / recommendation ---------------------------------------------

export type ScoredCandidate = {
  candidate: PickCandidate;
  score: number;
  // Every reason the scorer found, most compelling first — trimmed to
  // the top few only when converted to a `PickRecommendation` (see
  // selection.ts).
  reasons: readonly ReasonFact[];
};

export type PickRecommendation = {
  candidate: PickCandidate;
  reasons: readonly ReasonFact[];
};

export type PickSelection = {
  primary: PickRecommendation | null;
  alternatives: readonly PickRecommendation[];
};

export type PickResult = PickSelection & {
  // True only when the strict time budget produced zero eligible
  // candidates and Pick relaxed it to produce a result anyway — the UI
  // must say so, never relax silently (see docs/recommendations.md,
  // "Constraint relaxation").
  relaxedTimeConstraint: boolean;
};

// --- Taste summary --------------------------------------------------------

// A frequently (re)watched title used to seed provider "more like this"
// discovery — just enough to both request recommendations and name the
// seed in a reason (see scoring.ts, "similarToWatched").
export type RecommendationSeed = { id: number; title: string };

// Pick's own dedicated taste projection — deliberately smaller than
// `StatsProfile` (see taste-summary.ts for why this isn't a reuse of
// `getStatsProfile()` directly). Movie and show genre affinities stay
// separate because TMDB's movie and TV genre ID spaces are different
// (see docs/media-provider.md) — mixing them would risk sending a show
// genre ID to the movie discovery endpoint or vice versa.
export type RecommendationTasteSummary = {
  // False for a brand-new account with too little watch history —
  // discovery falls back to an honest "popular" source rather than
  // fabricating personalization it doesn't have (see
  // docs/recommendations.md, "New user fallback").
  hasEnoughDataForPersonalization: boolean;
  movieGenreAffinities: readonly GenreExposureStat[];
  showGenreAffinities: readonly GenreExposureStat[];
  topDirector: { id: number; name: string } | null;
  seedMovies: readonly RecommendationSeed[];
  seedShows: readonly RecommendationSeed[];
};
