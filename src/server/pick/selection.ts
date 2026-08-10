// Pure, deterministic selection — no I/O, no randomness (see
// docs/recommendations.md, "Determinism"). Turns a scored candidate pool
// into exactly one primary pick plus a small number of alternatives.
import {
  DIVERSITY_LOOKAHEAD,
  DIVERSITY_SCORE_BAND,
  PICK_ALTERNATIVE_COUNT,
  PRIMARY_VARIETY_POOL_SIZE,
  PRIMARY_VARIETY_SCORE_BAND,
} from "./constants";
import type { PickRecommendation, PickSelection, ScoredCandidate } from "./types";

// Only the top couple of reasons are ever shown per recommendation — see
// docs/recommendations.md, "Reason facts". `reasons` is already ordered
// most-compelling-first by the scorer, so a plain slice keeps the
// strongest ones.
const MAX_REASONS_SHOWN = 2;

function toRecommendation(scored: ScoredCandidate): PickRecommendation {
  return { candidate: scored.candidate, reasons: scored.reasons.slice(0, MAX_REASONS_SHOWN) };
}

// Score descending, then media provider id ascending as a final
// deterministic tie-break — never insertion order, which would silently
// depend on which candidate pool happened to be gathered first.
function rank(candidates: readonly ScoredCandidate[]): ScoredCandidate[] {
  return [...candidates].sort(
    (a, b) => b.score - a.score || a.candidate.mediaProviderId - b.candidate.mediaProviderId,
  );
}

// Chooses which of the leading, near-tied candidates becomes the primary
// pick — see docs/recommendations.md, "Controlled variety". `seed === 0`
// (the default every existing caller gets) always resolves to index 0,
// i.e. today's exact "always the single highest scorer" behavior; a
// nonzero seed only ever rotates within candidates genuinely close to
// the top score, so a meaningfully weaker candidate can never win.
function selectPrimaryIndex(ranked: readonly ScoredCandidate[], seed: number): number {
  const topScore = ranked[0]?.score ?? 0;
  let groupSize = 1;
  while (groupSize < ranked.length && groupSize < PRIMARY_VARIETY_POOL_SIZE) {
    const next = ranked[groupSize];
    if (!next || next.score < topScore * PRIMARY_VARIETY_SCORE_BAND) break;
    groupSize += 1;
  }
  if (groupSize <= 1) return 0;
  return Math.abs(Math.trunc(seed)) % groupSize;
}

// Primary is the single highest-scoring eligible candidate, with a bit of
// controlled rotation among near-ties (see `selectPrimaryIndex`).
// Alternatives prefer a `kind` not already chosen, but only when a
// close-scoring one exists within a bounded lookahead window (see
// DIVERSITY_SCORE_BAND/DIVERSITY_LOOKAHEAD) — otherwise the next-best
// candidate is taken regardless of repeated `kind`. One category
// legitimately dominating is a real, honest outcome the selection never
// forces itself away from (see docs/recommendations.md, "Diversity
// pass").
export function selectPicks(
  scored: readonly ScoredCandidate[],
  excludedMediaProviderIds: ReadonlySet<number> = new Set(),
  varietySeed = 0,
): PickSelection {
  const ranked = rank(scored).filter(
    (item) => !excludedMediaProviderIds.has(item.candidate.mediaProviderId),
  );

  const primaryIndex = selectPrimaryIndex(ranked, varietySeed);
  const primary = ranked[primaryIndex];

  if (!primary) {
    return { primary: null, alternatives: [] };
  }

  const remaining = ranked.filter((_, index) => index !== primaryIndex);
  const chosen: ScoredCandidate[] = [primary];
  const usedKinds = new Set([primary.candidate.kind]);

  while (chosen.length < 1 + PICK_ALTERNATIVE_COUNT && remaining.length > 0) {
    const [bestRemaining] = remaining;
    if (!bestRemaining) break;
    const bestRemainingScore = bestRemaining.score;
    const lookahead = remaining.slice(0, DIVERSITY_LOOKAHEAD);
    const diverseIndex = lookahead.findIndex(
      (item) =>
        !usedKinds.has(item.candidate.kind) &&
        item.score >= bestRemainingScore * DIVERSITY_SCORE_BAND,
    );

    const pickIndex = diverseIndex !== -1 ? diverseIndex : 0;
    const [picked] = remaining.splice(pickIndex, 1);
    if (!picked) break;
    chosen.push(picked);
    usedKinds.add(picked.candidate.kind);
  }

  // `chosen[0]` is always `primary` — it's never removed by the loop
  // above, which only ever splices from `remaining`.
  return {
    primary: toRecommendation(primary),
    alternatives: chosen.slice(1).map(toRecommendation),
  };
}
