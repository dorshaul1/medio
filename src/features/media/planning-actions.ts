"use server";

import type { MediaType } from "@/server/media/types";
import { revalidateTrackingSurfaces } from "@/server/mutations/revalidate-tracking-surfaces";
import { changePlanningIntent, removePlanningItem } from "@/server/planning/planning-items";
import type { PlanningIntent, PlanningItem } from "@/server/planning/types";

// Thin Server Action wrappers around the planning domain (see the
// equivalent comment in features/movies/movie-tracking-actions.ts).
// Shared across Movie and Show Details — unlike Tracking, Planning's
// domain logic doesn't differ between media types, so there's no reason
// for two near-identical action files. Revalidates via the one shared
// `revalidateTrackingSurfaces` — a planning change is never Diary-visible
// (no watch event involved), but it does change Home's Backlog row and
// Calendar's planned-release candidates (both read planning state), not
// just the media's own page and Library.

export async function changePlanningIntentAction(
  mediaType: MediaType,
  mediaProviderId: number,
  intent: PlanningIntent,
): Promise<PlanningItem> {
  const item = await changePlanningIntent(mediaType, mediaProviderId, intent);
  revalidatePlanningSurfaces(mediaType, mediaProviderId);
  return item;
}

export async function removePlanningItemAction(
  mediaType: MediaType,
  mediaProviderId: number,
): Promise<void> {
  await removePlanningItem(mediaType, mediaProviderId);
  revalidatePlanningSurfaces(mediaType, mediaProviderId);
}

function revalidatePlanningSurfaces(mediaType: MediaType, mediaProviderId: number): void {
  if (mediaType === "movie") {
    revalidateTrackingSurfaces({ movieProviderId: mediaProviderId, affectsDiary: false });
  } else {
    revalidateTrackingSurfaces({ showProviderId: mediaProviderId, affectsDiary: false });
  }
}
