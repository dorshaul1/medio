// Application-owned Stats domain models — see docs/stats.md. Everything
// here is *derived*: no field in this file is ever persisted as a source
// of truth (see CLAUDE.md, "Stats is derived..."). "Taste"-prefixed types
// below are Stats' Taste section specifically (genre/people signal
// extraction) — kept as their own vocabulary since they represent a
// distinct analytical concept within the broader Stats projection.
import type { CreditedPerson, Genre, MediaImage } from "@/server/media/types";
import type { StatsRange } from "./range";

// --- Bounded, hydrated title input ---------------------------------------
//
// The one shared input shape every pure analytics function in this
// domain consumes — never a raw DB row, never a raw TMDB DTO. Built by
// `hydrate.ts` from a bounded, deduplicated set of candidate titles (see
// docs/stats.md, "Provider metadata strategy").

// A cast credit carries its own profile image (already present on the
// title-credits response this app fetches for every rated title) so
// Favorite Actors never needs a separate Person fetch just for a
// portrait — see docs/stats.md, "Favorite people presentation". Directors
// (`CreditedPerson`) have no such image on this response; compose.ts
// hydrates a small, bounded, final set of director portraits after
// ranking (see hydrate.ts).
export type TasteCastCredit = { id: number; name: string; profile: MediaImage | null };

type TasteTitleCommon = {
  mediaProviderId: number;
  title: string;
  poster: MediaImage | null;
  year: number | null;
  genres: readonly Genre[];
  lastActivityAt: Date;
  // Top-billed cast (see TASTE_PRIMARY_CAST_LIMIT) — only ever populated
  // for the most-recently-active subset of hydrated titles; credit
  // hydration is bounded independent of total lifetime history (see
  // TASTE_CREDITS_HYDRATION_LIMIT, docs/stats.md).
  cast: readonly TasteCastCredit[];
};

export type TasteMovieTitle = TasteTitleCommon & {
  mediaType: "movie";
  // Total viewing events, rewatches included.
  watchCount: number;
  // Only populated for the credits-hydrated subset, same reasoning as
  // `cast`.
  directors: readonly CreditedPerson[];
  // Minutes, or null — comes free from the same MovieDetails fetch used
  // for genres, no extra provider request. Used only for the bounded
  // viewing-time estimate (see docs/stats.md, "Viewing time").
  runtimeMinutes: number | null;
};

export type TasteShowTitle = TasteTitleCommon & {
  mediaType: "show";
  // Unique regular (non-Special) episodes watched — title-level
  // eligibility already applied upstream (see
  // MIN_REGULAR_EPISODES_FOR_SHOW_TASTE_ELIGIBILITY).
  watchedEpisodeCount: number;
  // Total episode watch events beyond the first, across every season
  // (Specials included — a rewatched Special is still a real rewatch).
  rewatchedEpisodeCount: number;
  // Total episode watch events for this show, across every season
  // (Specials included) — used only for the viewing-time estimate below.
  totalEpisodeEvents: number;
  // Always populated — comes free from the same ShowDetails fetch used
  // for genres, no extra provider request (see docs/stats.md).
  creators: readonly CreditedPerson[];
  // TMDB's typical per-episode runtime for the whole show, or null —
  // comes free from the same ShowDetails fetch. A single approximate
  // figure applied to every episode of the show, not a true per-episode
  // runtime (see docs/stats.md, "Viewing time" for why this is an
  // accepted, documented approximation rather than a per-episode fetch).
  episodeRuntimeMinutes: number | null;
};

export type TasteTitle = TasteMovieTitle | TasteShowTitle;

// --- Genre insights --------------------------------------------------------

export type GenreExposureStat = {
  genreId: number;
  genreName: string;
  titleCount: number;
};

export type GenreInsights = {
  mostWatched: readonly GenreExposureStat[];
};

// --- People insights ---------------------------------------------------

// `profile` is populated directly during ranking when the source credit
// already carries one (actors — see `TasteCastCredit`); for directors
// (no image on `CreditedPerson`) it starts `null` and compose.ts fills in
// a small, bounded, final hydration after ranking (see hydrate.ts).
export type PersonTasteStat = {
  personId: number;
  name: string;
  // How many of the user's hydrated, credits-eligible titles this person
  // appears in — a pure exposure signal, ranked highest-first (see
  // docs/stats.md, "Favorite people").
  titleCount: number;
  profile: MediaImage | null;
};

// --- Rewatch insights ------------------------------------------------------

export type MovieRewatchAggregate = {
  movieProviderId: number;
  watchCount: number;
  lastWatchedAt: Date;
};

export type ShowRewatchAggregate = {
  showProviderId: number;
  rewatchedEpisodeCount: number;
};

export type MostRewatchedMovie = {
  mediaProviderId: number;
  title: string;
  poster: MediaImage | null;
  watchCount: number;
};

export type MostRevisitedShow = {
  mediaProviderId: number;
  title: string;
  poster: MediaImage | null;
  rewatchedEpisodeCount: number;
};

export type RewatchInsights = {
  mostRewatchedMovie: MostRewatchedMovie | null;
  mostRevisitedShow: MostRevisitedShow | null;
  // Percentage of unique watched titles (movies + meaningfully-watched
  // shows) that received at least one rewatch — see docs/stats.md,
  // "Rewatch rate". Null when the sample is too small to mean anything.
  rewatchRatePercent: number | null;
};

// --- Behavior insights ---------------------------------------------------

export type CompletionTendency = "finishes" | "explores";

export type CompletionInsight = {
  tendency: CompletionTendency;
  trackedShowCount: number;
  droppedShowCount: number;
  onHoldShowCount: number;
} | null;

export type MovieVsShowInsight = {
  moviePercent: number;
  showPercent: number;
  totalTitles: number;
} | null;

// --- Viewing timeline ------------------------------------------------------

// One calendar month's total viewing *events* (movies + episodes,
// rewatches included — this correctly reflects real viewing volume; see
// docs/stats.md, "Viewing timeline"). Always exactly 12 entries, oldest
// first, including months with zero activity — a real gap is real
// information, not something to hide.
export type MonthlyActivity = {
  year: number;
  month: number; // 1-12
  monthLabel: string; // e.g. "Jan" — already localized, UI renders as-is
  eventCount: number;
};

// The viewing-rhythm chart's bucket granularity varies with the selected
// range (see docs/stats.md, "Viewing rhythm and range"): a single month
// selected buckets by day, a year or Last 12 months buckets by month
// (`MonthlyActivity`, unchanged), and All time buckets by year — never a
// 10-year, 120-column monthly chart. `ActivityBucket` is the one generic
// shape the UI actually renders; `toActivityBuckets`/`computeDailyActivity`/
// `computeYearlyActivity` (`timeline.ts`) each produce it from their own
// granularity-appropriate source.
export type ActivityBucketGranularity = "day" | "month" | "year";

export type ActivityBucket = {
  key: string;
  label: string;
  eventCount: number;
};

export type ViewingRhythm = {
  granularity: ActivityBucketGranularity;
  buckets: readonly ActivityBucket[];
} | null;

// Which day of the week the user tends to watch on — see docs/stats.md,
// "Viewing rhythm and range". Only ever populated for range kinds that
// already fetch raw timestamps ("month"/"year"/"last12months"); "All
// time" omits it rather than pulling unbounded raw events just for this.
// `mostActiveDay` is `null` when every day is exactly tied — the bar
// breakdown still renders, but no single-day claim is made.
export type WeekdayRhythm = {
  mostActiveDay: string | null;
  buckets: readonly ActivityBucket[];
} | null;

// Minutes estimated across every hydrated title (movie runtime × movie
// watch events; a show's typical episode runtime × its episode watch
// events — see docs/stats.md, "Viewing time"). Only ever produced when
// `coverageRatio` clears MIN_RUNTIME_COVERAGE_RATIO; the UI never sees a
// low-confidence estimate to accidentally render.
export type ViewingTimeEstimate = {
  minutes: number;
  coverageRatio: number;
};

// --- Headline --------------------------------------------------------------

export type TasteHeadline =
  | { kind: "most_watched_genre"; genre: string }
  | { kind: "favorite_director"; name: string }
  | { kind: "favorite_actor"; name: string }
  | { kind: "sparse" };

// --- Overview (viewing volume) --------------------------------------------

export type TasteOverview = {
  uniqueMoviesWatched: number;
  movieWatchEventCount: number;
  uniqueEpisodesWatched: number;
  episodeWatchEventCount: number;
  // Shows meeting title-level eligibility (see
  // MIN_REGULAR_EPISODES_FOR_SHOW_TASTE_ELIGIBILITY) — never "every show
  // with a row in show_tracking_state."
  uniqueShowsWatched: number;
};

// --- The composed projection ----------------------------------------------

export type StatsProfile = {
  // The exact range this profile was computed for — echoed back so the
  // UI/comparison layer never has to re-derive it.
  range: StatsRange;
  // False only when the user has never recorded a single movie or
  // episode watch *within the selected range* — see docs/stats.md,
  // "Empty vs. sparse vs. no history in range".
  hasAnyHistory: boolean;
  overview: TasteOverview;
  headline: TasteHeadline;
  // Oldest-to-newest, granularity depends on the selected range — null
  // only when there is no history in range at all (see docs/stats.md).
  viewingRhythm: ViewingRhythm;
  weekdayRhythm: WeekdayRhythm;
  estimatedViewingTime: ViewingTimeEstimate | null;
  genres: GenreInsights;
  directors: readonly PersonTasteStat[];
  actors: readonly PersonTasteStat[];
  rewatch: RewatchInsights;
  movieVsShow: MovieVsShowInsight;
  completion: CompletionInsight;
};

// --- Comparison --------------------------------------------------------

// One human-language comparison sentence, already fully composed server-
// side (see docs/stats.md, "Comparison") — never a raw
// `{ metric, delta, percent }` tuple the UI has to phrase itself, and
// never a red/green up/down signal (watching more or less TV isn't
// inherently good or bad — see CLAUDE.md, "No judgment").
export type ComparisonFact = {
  kind: "movies" | "episodes" | "shows" | "genreShift" | "movieVsShowShift";
  text: string;
};

export type StatsComparison = {
  previousLabel: string;
  facts: readonly ComparisonFact[];
} | null;
