// Pure, deterministic scoring — no I/O, no randomness. See
// docs/recommendations.md, "Scoring model". Each candidate kind has its
// own scoring function since the *evidence* available differs by kind
// (a continuation has recency/finish-soon evidence; a discovery pick has
// taste-affinity evidence) — forcing one universal formula would just
// hide that difference behind meaningless shared fields.
import {
  BACKLOG_BASE_SCORE,
  CONTINUE_BASE_SCORE,
  DIRECTOR_AFFINITY_BONUS,
  DISCOVERY_BASE_SCORE,
  FINISH_SOON_BONUS,
  GENRE_AFFINITY_BONUS,
  GENRE_AFFINITY_MAX_BONUS,
  RECENT_CONTINUATION_BONUS,
  RECENT_CONTINUATION_MAX_DAYS,
  RECOMMENDATION_SOURCE_BONUS,
  TIME_FIT_BONUS,
  WATCHLIST_BASE_SCORE,
} from "./constants";
import type {
  ContinueEpisodeCandidate,
  DecisionContext,
  DiscoveryMovieCandidate,
  DiscoveryShowCandidate,
  PickCandidate,
  ReasonFact,
  RecommendationTasteSummary,
  SavedMovieCandidate,
  SavedShowCandidate,
  ScoredCandidate,
} from "./types";

function genreAffinityBonus(
  candidate: PickCandidate,
  taste: RecommendationTasteSummary,
): { bonus: number; reason: ReasonFact | null } {
  const affinities =
    candidate.mediaType === "movie" ? taste.movieGenreAffinities : taste.showGenreAffinities;
  if (affinities.length === 0) return { bonus: 0, reason: null };

  const candidateGenreIds = new Set(candidate.genres.map((genre) => genre.id));
  // `affinities` is already ranked strongest-first (see taste-summary.ts),
  // so the first match found is the strongest one worth naming.
  const [strongestMatch, ...restMatches] = affinities.filter((affinity) =>
    candidateGenreIds.has(affinity.genreId),
  );
  if (!strongestMatch) return { bonus: 0, reason: null };

  return {
    bonus: Math.min((1 + restMatches.length) * GENRE_AFFINITY_BONUS, GENRE_AFFINITY_MAX_BONUS),
    reason: { kind: "highGenreAffinity", genreName: strongestMatch.genreName },
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

// A continuation earns this only when the show's last watch activity
// falls genuinely within the recent window — never a vague "you've been
// watching this" claim (see docs/recommendations.md, "Reason
// truthfulness"). `now` defaults to the real current time but stays an
// explicit parameter so this remains deterministic/testable, same
// discipline as `server/calendar/*`'s own `now: Date` parameters.
function recentContinuationBonus(
  candidate: ContinueEpisodeCandidate,
  now: Date,
): { bonus: number; reason: ReasonFact | null } {
  const daysAgo = Math.floor((now.getTime() - candidate.lastActivityAt.getTime()) / DAY_MS);
  if (daysAgo < 0 || daysAgo > RECENT_CONTINUATION_MAX_DAYS) {
    return { bonus: 0, reason: null };
  }
  return {
    bonus: RECENT_CONTINUATION_BONUS,
    reason: { kind: "recentContinuation", daysAgo },
  };
}

function timeFitBonus(
  candidate: PickCandidate,
  context: DecisionContext,
): { bonus: number; reason: ReasonFact | null } {
  if (context.timeBudgetMinutes === null) return { bonus: 0, reason: null };
  if (candidate.runtimeMinutes === null) return { bonus: 0, reason: null };
  if (candidate.runtimeMinutes > context.timeBudgetMinutes) return { bonus: 0, reason: null };

  return { bonus: TIME_FIT_BONUS, reason: { kind: "timeFit", minutes: candidate.runtimeMinutes } };
}

function scoreContinue(
  candidate: ContinueEpisodeCandidate,
  context: DecisionContext,
  now: Date,
): ScoredCandidate {
  const reasons: ReasonFact[] = [];
  let score = CONTINUE_BASE_SCORE;

  if (candidate.isFinishSoon) {
    score += FINISH_SOON_BONUS;
    reasons.push({ kind: "finishSoon", remainingEpisodes: candidate.remainingAiredEpisodeCount });
  } else {
    reasons.push({ kind: "continueActiveShow" });
  }

  const recency = recentContinuationBonus(candidate, now);
  score += recency.bonus;
  if (recency.reason) reasons.push(recency.reason);

  const time = timeFitBonus(candidate, context);
  score += time.bonus;
  if (time.reason) reasons.push(time.reason);

  return { candidate, score, reasons };
}

function scoreSaved(
  candidate: SavedMovieCandidate | SavedShowCandidate,
  context: DecisionContext,
  taste: RecommendationTasteSummary,
): ScoredCandidate {
  const reasons: ReasonFact[] = [
    { kind: candidate.intent === "backlog" ? "backlogIntent" : "watchlistIntent" },
  ];
  let score = candidate.intent === "backlog" ? BACKLOG_BASE_SCORE : WATCHLIST_BASE_SCORE;

  const genre = genreAffinityBonus(candidate, taste);
  score += genre.bonus;
  if (genre.reason) reasons.push(genre.reason);

  const time = timeFitBonus(candidate, context);
  score += time.bonus;
  if (time.reason) reasons.push(time.reason);

  return { candidate, score, reasons };
}

function scoreDiscovery(
  candidate: DiscoveryMovieCandidate | DiscoveryShowCandidate,
  context: DecisionContext,
  taste: RecommendationTasteSummary,
): ScoredCandidate {
  const reasons: ReasonFact[] = [];
  let score = DISCOVERY_BASE_SCORE;

  if (candidate.source === "recommendation") {
    score += RECOMMENDATION_SOURCE_BONUS;
    reasons.push(
      candidate.seedTitle
        ? { kind: "similarToHighlyRated", title: candidate.seedTitle }
        : { kind: "popularDiscovery" },
    );
  } else if (candidate.source === "director" && taste.topDirector) {
    score += DIRECTOR_AFFINITY_BONUS;
    reasons.push({ kind: "directorAffinity", directorName: taste.topDirector.name });
  } else if (candidate.source === "popular") {
    reasons.push({ kind: "popularDiscovery" });
  }

  const genre = genreAffinityBonus(candidate, taste);
  score += genre.bonus;
  if (genre.reason) reasons.push(genre.reason);

  const time = timeFitBonus(candidate, context);
  score += time.bonus;
  if (time.reason) reasons.push(time.reason);

  // A "genre" source with no matching affinity (e.g. the top genre by
  // rating didn't end up on this particular title) would otherwise leave
  // a recommendation with zero reasons — never present a pick with no
  // explanation at all.
  if (reasons.length === 0) reasons.push({ kind: "popularDiscovery" });

  return { candidate, score, reasons };
}

export function scoreCandidate(
  candidate: PickCandidate,
  context: DecisionContext,
  taste: RecommendationTasteSummary,
  now: Date = new Date(),
): ScoredCandidate {
  switch (candidate.kind) {
    case "continueEpisode":
      return scoreContinue(candidate, context, now);
    case "savedMovie":
    case "savedShow":
      return scoreSaved(candidate, context, taste);
    case "discoveryMovie":
    case "discoveryShow":
      return scoreDiscovery(candidate, context, taste);
  }
}
