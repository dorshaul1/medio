import "server-only";
import { requireSession } from "@/server/auth/session";
import { getContinueCandidates } from "./candidates-continue";
import { getDiscoveryCandidates } from "./candidates-discovery";
import { getSavedCandidates } from "./candidates-saved";
import { PICK_ALTERNATIVE_COUNT } from "./constants";
import { filterEligible, relaxTimeConstraint } from "./eligibility";
import { scoreCandidate } from "./scoring";
import { selectPicks } from "./selection";
import { getRecommendationTasteSummary } from "./taste-summary";
import type { DecisionContext, PickCandidate, PickResult } from "./types";

// The one server entrypoint this whole domain exists to produce — see
// docs/recommendations.md. Owns the session boundary, same layering as
// `getStatsProfile`/`getLibraryPage`: every lower-level candidate/taste
// query is explicitly scoped, never session-aware itself.
//
// Nothing here is ever persisted — `context`, `excludedMediaProviderIds`,
// and `varietySeed` are all session-only client state the caller threads
// back in on every call (see docs/recommendations.md, "Session-only
// context"). `varietySeed` defaults to 0 (fully deterministic — always
// the single highest-scoring candidate) so every existing caller that
// doesn't pass one keeps today's exact behavior; a real page request
// passes a freshly-generated one to enable controlled rotation among
// near-tied candidates (see selection.ts, docs/recommendations.md,
// "Controlled variety").
export async function getPickRecommendations(
  context: DecisionContext,
  excludedMediaProviderIds: ReadonlySet<number> = new Set(),
  varietySeed = 0,
): Promise<PickResult> {
  const { user } = await requireSession();

  const [continueCandidates, saved, taste] = await Promise.all([
    getContinueCandidates(),
    getSavedCandidates(),
    getRecommendationTasteSummary(user.id),
  ]);

  // Discovery must never re-offer a title the user already saved or is
  // already continuing — see docs/recommendations.md, "Discovery
  // candidate exclusion".
  const excludeMovieIds = new Set(saved.movies.map((movie) => movie.mediaProviderId));
  const excludeShowIds = new Set([
    ...saved.shows.map((show) => show.mediaProviderId),
    ...continueCandidates.map((show) => show.mediaProviderId),
  ]);

  // Staged evaluation — Discovery is the one expensive step (provider
  // hydration for a bounded but real number of titles), so it's only
  // ever fetched once the cheap local pool (Continue + Backlog +
  // Watchlist) can't already fill the full result shape on its own — see
  // docs/recommendations.md, "Performance architecture". This is a real
  // skip, not a lazy shortcut: existing intent already outranks Discovery
  // at the base-score level, so a Discovery candidate could only ever
  // have won an alternative's diversity slot here, never the primary.
  const localCandidates: readonly PickCandidate[] = [
    ...continueCandidates,
    ...saved.movies,
    ...saved.shows,
  ];
  const eligibleLocalCount = filterEligible(localCandidates, context).length;
  const needsDiscovery = eligibleLocalCount < 1 + PICK_ALTERNATIVE_COUNT;

  const discovery = needsDiscovery
    ? await getDiscoveryCandidates({ taste, excludeMovieIds, excludeShowIds })
    : { movies: [], shows: [] };

  const allCandidates: readonly PickCandidate[] = [
    ...localCandidates,
    ...discovery.movies,
    ...discovery.shows,
  ];

  const strictEligible = filterEligible(allCandidates, context);
  let eligible = strictEligible;
  let relaxedTimeConstraint = false;

  // Relaxation order is time-first, format-never — see
  // docs/recommendations.md, "Constraint relaxation". Only attempted when
  // the strict context leaves genuinely nothing to recommend.
  if (eligible.length === 0 && context.timeBudgetMinutes !== null) {
    eligible = filterEligible(allCandidates, relaxTimeConstraint(context));
    relaxedTimeConstraint = eligible.length > 0;
  }

  const scored = eligible.map((candidate) => scoreCandidate(candidate, context, taste));
  const selection = selectPicks(scored, excludedMediaProviderIds, varietySeed);

  return { ...selection, relaxedTimeConstraint };
}
