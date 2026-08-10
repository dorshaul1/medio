"use server";

import { revalidatePath } from "next/cache";
import { mediaHref } from "@/features/media/media-route";
import type { MediaType } from "@/server/media/types";
import { changePlanningIntent, removePlanningItem } from "@/server/planning/planning-items";
import type { PlanningIntent, PlanningItem } from "@/server/planning/types";

// Thin Server Action wrappers around the planning domain (see the
// equivalent comment in features/movies/movie-tracking-actions.ts).
// Shared across Movie and Show Details — unlike Tracking, Planning's
// domain logic doesn't differ between media types, so there's no reason
// for two near-identical action files.

export async function changePlanningIntentAction(
  mediaType: MediaType,
  mediaProviderId: number,
  intent: PlanningIntent,
): Promise<PlanningItem> {
  const item = await changePlanningIntent(mediaType, mediaProviderId, intent);
  revalidatePath(mediaHref({ mediaType, id: mediaProviderId }));
  // Also called from Library rows (see features/library/library-item-actions.tsx).
  revalidatePath("/library");
  return item;
}

export async function removePlanningItemAction(
  mediaType: MediaType,
  mediaProviderId: number,
): Promise<void> {
  await removePlanningItem(mediaType, mediaProviderId);
  revalidatePath(mediaHref({ mediaType, id: mediaProviderId }));
  revalidatePath("/library");
}
