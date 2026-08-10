"use server";

import { revalidatePath } from "next/cache";
import { mediaHref } from "@/features/media/media-route";
import { clearMediaNote, setMediaNote } from "@/server/opinions/notes";
import { clearMediaRating, setMediaRating } from "@/server/opinions/ratings";
import type { MediaNote, MediaRating, OpinionMediaType } from "@/server/opinions/types";

// Thin Server Action wrappers around the opinion domain (see the
// equivalent comment in features/media/planning-actions.ts) — shared
// across Movie and Show Details, same reasoning `planning-actions.ts`
// already established: opinion logic doesn't differ between media
// types, so there's no reason for two near-identical action files.
// Opinion data never affects the tracking domain (watch events, Show
// progress, Watchlist/Backlog) — none of these revalidate `/library` or
// `/` (compare `movie-tracking-actions.ts`), since nothing outside the
// media's own Details page reads opinion data yet (see docs/opinions.md).

export async function setMediaRatingAction(
  mediaType: OpinionMediaType,
  mediaProviderId: number,
  rating: number,
): Promise<MediaRating> {
  const result = await setMediaRating({ mediaType, mediaProviderId, rating });
  revalidatePath(mediaHref({ mediaType, id: mediaProviderId }));
  return result;
}

export async function clearMediaRatingAction(
  mediaType: OpinionMediaType,
  mediaProviderId: number,
): Promise<void> {
  await clearMediaRating({ mediaType, mediaProviderId });
  revalidatePath(mediaHref({ mediaType, id: mediaProviderId }));
}

export async function setMediaNoteAction(
  mediaType: OpinionMediaType,
  mediaProviderId: number,
  content: string,
): Promise<MediaNote | null> {
  const result = await setMediaNote({ mediaType, mediaProviderId, content });
  revalidatePath(mediaHref({ mediaType, id: mediaProviderId }));
  return result;
}

export async function clearMediaNoteAction(
  mediaType: OpinionMediaType,
  mediaProviderId: number,
): Promise<void> {
  await clearMediaNote({ mediaType, mediaProviderId });
  revalidatePath(mediaHref({ mediaType, id: mediaProviderId }));
}
