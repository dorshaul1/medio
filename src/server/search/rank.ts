// Unified Search's own relevance ranking — pure, no I/O. Movies, Shows,
// and People are ranked in one pass, never three separate sorted lists —
// see docs/search.md, "Unified search ranking". This answers
// "what did the user most likely mean?", not "which type is this?" — type
// never creates a priority tier on its own.

export type RankableCandidate = {
  // A stable, globally-unique id across all three types — the final tie-
  // break, and what the caller uses to map a ranked candidate back to its
  // real result object.
  id: string;
  // Every string this candidate could reasonably be typed/found as — a
  // movie/show's title *and* original title; a person's name. The best
  // (highest) match quality across these wins.
  names: readonly string[];
  // TMDB's own relevance/popularity signal for this candidate — a movie/
  // show's vote count (see below for why, not `popularity`) or a
  // person's `popularity`. An ambiguity resolver, never the primary
  // signal — see `matchQuality` and the weights below.
  popularitySignal: number;
  releaseYear: number | null;
  // Whether the user already has *some* relationship with this title
  // (Watchlist/Backlog/Watched/Watching/...) — a small bounded boost,
  // never enough to beat a clearly better textual match. Irrelevant for
  // People (always `false`).
  hasPersonalState: boolean;
};

// Discrete match-quality tiers, not a continuous string-distance score —
// a title is either exactly what was typed, starts with it, contains it
// as a whole word, or merely contains it somewhere; those are
// qualitatively different kinds of match, not points on a smooth
// gradient, and TMDB results are far too few for a smooth ranking to
// visibly matter over a simple, explainable tier system.
const MATCH_QUALITY = {
  exact: 1,
  prefix: 0.75,
  wordBoundary: 0.55,
  substring: 0.3,
  none: 0,
} as const;

// Centralized, named weights — never a magic number inline (see
// docs/media-provider.md). `textMatch` itself has no weight entry: it's
// the base every other signal is added on top of, not a sibling knob.
// The other three are deliberately small enough that their combined
// maximum (0.12 + 0.04 + 0.03 = 0.19) is strictly less than the smallest
// gap between any two adjacent MATCH_QUALITY tiers (0.2, between
// wordBoundary and prefix) — a structural guarantee, not a convention
// someone has to remember, that popularity/recency/personal state can
// only ever break ties *within* a tier (or between two near-equal
// scores), never lift a weaker-tier candidate above a stronger one. See
// rank.test.ts, "secondary signals never cross a match-quality tier".
export const SEARCH_RANK_WEIGHTS = {
  popularity: 0.12,
  recency: 0.04,
  personalState: 0.03,
} as const;

// Case, whitespace, punctuation, and apostrophes are all typing noise a
// user shouldn't have to match exactly; basic Latin diacritics fold to
// their base letter (e.g. "café" -> "cafe") since that's how most people
// actually type. Deliberately Unicode-aware (`\p{L}`/`\p{N}`, not
// `[a-z0-9]`) rather than an English-only filter — a Japanese, Korean, or
// Arabic title must normalize to itself, not to an empty string. Exported
// for tests and for a future exact caller that needs the same folding.
export function normalizeSearchText(value: string): string {
  return (
    value
      .normalize("NFKD")
      // Strips combining diacritical marks left behind by NFKD
      // decomposition (e.g. "é" -> "e" + U+0301) — folds accented Latin
      // text to its base letters without touching non-Latin scripts, which
      // NFKD doesn't decompose the same way.
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ")
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The best match tier a single (name, query) pair achieves. Exported for
// tests — see rank.test.ts.
export function matchQuality(name: string, normalizedQuery: string): number {
  if (!normalizedQuery) return MATCH_QUALITY.none;
  const normalizedName = normalizeSearchText(name);

  if (normalizedName === normalizedQuery) return MATCH_QUALITY.exact;
  if (normalizedName.startsWith(normalizedQuery)) return MATCH_QUALITY.prefix;

  // `\b` is ASCII-word-boundary-based (built on `\w`), so it doesn't
  // reliably bound non-Latin scripts (CJK, Arabic, ...) the same way it
  // does space-separated Latin words — a known, accepted limitation of
  // this one tier specifically. exact/prefix/substring above (and below)
  // don't depend on `\b` at all, so non-Latin queries still match
  // correctly through those tiers.
  const boundary = new RegExp(`\\b${escapeRegExp(normalizedQuery)}\\b`, "u");
  if (boundary.test(normalizedName)) return MATCH_QUALITY.wordBoundary;
  if (normalizedName.includes(normalizedQuery)) return MATCH_QUALITY.substring;

  return MATCH_QUALITY.none;
}

// TMDB's raw vote count/popularity figures span several orders of
// magnitude (a handful of votes to hundreds of thousands) — a log scale
// keeps one runaway blockbuster from mathematically drowning out every
// other signal, while still meaningfully separating "well-known" from
// "obscure". Clamped to [0, 1].
function normalizedPopularity(raw: number): number {
  return Math.max(0, Math.min(1, Math.log10(raw + 1) / 5));
}

// A small, decaying boost for recent media — "recent popular media may
// be slightly more likely... when text relevance is otherwise equal", not
// a newest-first sort (see docs/media-provider.md). Fully decayed past
// ~25 years old; irrelevant for People (no release year).
function recencyBoost(releaseYear: number | null): number {
  if (!releaseYear) return 0;
  const age = new Date().getFullYear() - releaseYear;
  if (age < 0) return 0;
  return Math.max(0, 1 - age / 25);
}

function scoreCandidate(
  candidate: RankableCandidate,
  normalizedQuery: string,
): { textMatch: number; total: number } {
  const textMatch = Math.max(...candidate.names.map((name) => matchQuality(name, normalizedQuery)));
  const popularity =
    normalizedPopularity(candidate.popularitySignal) * SEARCH_RANK_WEIGHTS.popularity;
  const recency = recencyBoost(candidate.releaseYear) * SEARCH_RANK_WEIGHTS.recency;
  const personalState = (candidate.hasPersonalState ? 1 : 0) * SEARCH_RANK_WEIGHTS.personalState;
  return { textMatch, total: textMatch + popularity + recency + personalState };
}

// One deterministic, cross-type ranked order — see the module comment.
// Candidates with zero text relevance (didn't match the query at all,
// which can happen for a fuzzy/partial provider result) are dropped
// entirely rather than ranked last, since "somewhere on the list" would
// still be a wrong result, not just a low-ranked one. Stable on real
// ties: same score sorts by `id`, so re-running the exact same query
// against the exact same candidates always produces the exact same order.
export function rankSearchResults(
  candidates: readonly RankableCandidate[],
  query: string,
): readonly string[] {
  const normalizedQuery = normalizeSearchText(query);

  return (
    candidates
      .map((candidate) => ({ id: candidate.id, ...scoreCandidate(candidate, normalizedQuery) }))
      // Popularity/recency/personal state are ambiguity resolvers, not
      // independent relevance sources — a candidate that didn't match the
      // query's *text* at all must never surface just because it happens to
      // be popular or already in the user's Library.
      .filter((entry) => entry.textMatch > 0)
      .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id))
      .map((entry) => entry.id)
  );
}
