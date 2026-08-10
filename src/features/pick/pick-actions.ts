"use server";

import { getPickRecommendations } from "@/server/pick/compose";
import type { DecisionContext, PickResult } from "@/server/pick/types";

// Pick's Format/Time context and its "Not now"/"Another Pick" exclusion
// set are pure session-only client state (see docs/recommendations.md,
// "Session-only context") — this is the one Server Action that re-runs
// the decision engine against them. There's no Server Component refetch
// path for this because the values driving it only ever exist in the
// browser, never in a URL or cookie.
//
// Marking something watched or saving it reuses the existing tracking/
// planning Server Actions directly (see PickCard) — Pick doesn't
// duplicate those.
export async function refreshPickAction(
  context: DecisionContext,
  excludedMediaProviderIds: readonly number[],
  varietySeed: number,
): Promise<PickResult> {
  return getPickRecommendations(context, new Set(excludedMediaProviderIds), varietySeed);
}
