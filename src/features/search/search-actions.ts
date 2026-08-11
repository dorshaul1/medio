"use server";

import type { PlanningIntent } from "@/server/planning/types";
import { getCurrentUserPreferences } from "@/server/preferences/queries";
import { searchAll } from "@/server/search/compose";
import { SEARCH_SUGGESTION_LIMIT } from "@/server/search/constants";
import type { UnifiedSearchResults } from "@/server/search/types";

// GlobalSearch's own bounded suggestion fetch — called from the client
// overlay on a debounced query commit, never per keystroke (see
// GlobalSearch's own comment). Bundles `defaultSaveIntent` into the same
// response rather than threading it down as a separate prop through the
// client Provider tree — one round trip, not two. One unified, cross-
// type ranked list (see docs/search.md, "Unified search
// ranking") — never a fixed per-type quota.
export async function getSearchSuggestionsAction(
  query: string,
): Promise<{ results: UnifiedSearchResults; defaultSaveIntent: PlanningIntent }> {
  const [results, { defaultSaveIntent }] = await Promise.all([
    searchAll(query, SEARCH_SUGGESTION_LIMIT),
    getCurrentUserPreferences(),
  ]);

  return { results, defaultSaveIntent };
}
