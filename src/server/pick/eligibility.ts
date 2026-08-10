// Pure eligibility filtering — no I/O. See docs/recommendations.md,
// "Eligibility". A candidate's format never gets silently relaxed —
// "Movies only" always means only movies; only the time budget is ever
// automatically loosened (see `relaxTimeConstraint`, used by compose.ts
// only when the strict context yields zero results).
import { TIME_BUDGET_QUICK_MINUTES } from "./constants";
import type { DecisionContext, PickCandidate } from "./types";

function matchesMediaType(
  candidate: PickCandidate,
  mediaType: DecisionContext["mediaType"],
): boolean {
  return mediaType === "any" || candidate.mediaType === mediaType;
}

// Under the strict "Quick" tier only, a candidate with unknown runtime is
// excluded outright — claiming (even implicitly, by including it under a
// "fits in ~35 minutes" context) that an unknown-length title fits would
// be a false claim. Under the two longer tiers or "any" time budget, an
// unknown-runtime candidate stays eligible; it simply never earns the
// time-fit bonus (see scoring.ts). Every tier past "Quick" shares this
// same "unknown stays eligible" rule, so a single numeric comparison
// covers all of them — the exact tier boundary is the only thing that
// changes between them.
export function isEligible(candidate: PickCandidate, context: DecisionContext): boolean {
  if (!matchesMediaType(candidate, context.mediaType)) return false;

  if (context.timeBudgetMinutes === null) return true;

  if (context.timeBudgetMinutes === TIME_BUDGET_QUICK_MINUTES) {
    return (
      candidate.runtimeMinutes !== null && candidate.runtimeMinutes <= context.timeBudgetMinutes
    );
  }
  return candidate.runtimeMinutes === null || candidate.runtimeMinutes <= context.timeBudgetMinutes;
}

export function filterEligible(
  candidates: readonly PickCandidate[],
  context: DecisionContext,
): readonly PickCandidate[] {
  return candidates.filter((candidate) => isEligible(candidate, context));
}

// Relaxation order is time-first, format-never — see
// docs/recommendations.md, "Constraint relaxation". Only ever called by
// compose.ts after the strict context produced zero eligible candidates,
// and the UI must be told relaxation happened (see `PickResult.
// relaxedTimeConstraint`) rather than silently substituting a result.
export function relaxTimeConstraint(context: DecisionContext): DecisionContext {
  return { ...context, timeBudgetMinutes: null };
}
