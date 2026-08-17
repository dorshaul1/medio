"use server";

import { revalidatePath } from "next/cache";
import { mediaHref } from "@/features/media/media-route";
import { clearMediaComment, setMediaComment } from "@/server/opinions/comments";
import type { MediaComment, OpinionMediaType } from "@/server/opinions/types";

// Thin Server Action wrappers around the opinion domain (see the
// equivalent comment in features/media/planning-actions.ts) — shared
// across Movie and Show Details, same reasoning `planning-actions.ts`
// already established: comment logic doesn't differ between media
// types, so there's no reason for two near-identical action files.
// Comment data never affects the tracking domain (watch events, Show
// progress, Watchlist/Backlog) — this never revalidates `/library` or
// `/` (compare `movie-tracking-actions.ts`), since nothing outside the
// media's own Details page reads comment data (see docs/opinions.md).

export async function setMediaCommentAction(
  mediaType: OpinionMediaType,
  mediaProviderId: number,
  content: string,
): Promise<MediaComment | null> {
  const result = await setMediaComment({ mediaType, mediaProviderId, content });
  revalidatePath(mediaHref({ mediaType, id: mediaProviderId }));
  return result;
}

export async function clearMediaCommentAction(
  mediaType: OpinionMediaType,
  mediaProviderId: number,
): Promise<void> {
  await clearMediaComment({ mediaType, mediaProviderId });
  revalidatePath(mediaHref({ mediaType, id: mediaProviderId }));
}
