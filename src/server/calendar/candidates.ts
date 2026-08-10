import "server-only";
import { listPlanningItems } from "@/server/planning/planning-items";
import type { PlanningItem } from "@/server/planning/types";
import { listWatchingShows } from "@/server/tracking/show-state";
import type { ShowTrackingState } from "@/server/tracking/types";
import {
  CALENDAR_ACTIVE_SHOW_CANDIDATE_LIMIT,
  CALENDAR_PLANNED_CANDIDATE_LIMIT,
} from "./constants";

// Calendar's candidate-first identity gathering — see docs/calendar.md,
// "Candidate-first release hydration". Every function here is a cheap,
// bounded local-DB read; provider hydration (the actually-expensive
// step) happens only afterward, in compose.ts, and only for these
// bounded candidate sets.

export async function getActiveShowCandidates(): Promise<readonly ShowTrackingState[]> {
  // Explicit "watching" state — Caught Up/Waiting shows are *derived*
  // from this same set (see docs/tracking.md), so this already covers
  // every show that could plausibly have new-episode intelligence to
  // show, without a separate "is this show caught up" query.
  return listWatchingShows(CALENDAR_ACTIVE_SHOW_CANDIDATE_LIMIT);
}

export async function getPlannedCandidates(): Promise<{
  shows: readonly PlanningItem[];
  movies: readonly PlanningItem[];
}> {
  const items = await listPlanningItems(CALENDAR_PLANNED_CANDIDATE_LIMIT);
  return {
    shows: items.filter((item) => item.mediaType === "show"),
    movies: items.filter((item) => item.mediaType === "movie"),
  };
}
