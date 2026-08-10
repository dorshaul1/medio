"use server";

import { revalidatePath } from "next/cache";
import {
  recordMovieWatch,
  removeMovieWatchEvent,
  updateMovieWatchedAt,
} from "@/server/tracking/movie-events";
import type { MovieWatchEvent } from "@/server/tracking/types";

// Thin Server Action wrappers around the tracking domain
// (src/server/tracking/movie-events.ts) — the domain functions already
// authenticate/authorize themselves via `requireSession()`, so these only
// add the one thing a Server Action needs to add: revalidating the movie
// page so the UI reflects the new state in the same round trip (see
// docs/tracking.md). Reads don't need a Server Action at all — Movie
// Details (a Server Component) calls `getMovieWatchSummary`/
// `listMovieWatchEvents` directly.

export async function markMovieWatchedAction(
  movieProviderId: number,
  watchedAt?: Date,
): Promise<MovieWatchEvent> {
  const event = await recordMovieWatch({ movieProviderId, ...(watchedAt ? { watchedAt } : {}) });
  revalidatePath(`/movies/${movieProviderId}`);
  // Also called as Library's own "Mark watched" quick action for a
  // planned movie (see features/library/library-movie-quick-action.tsx)
  // — clears its planning entry, so Library's own page needs to refresh.
  revalidatePath("/library");
  return event;
}

export async function removeMovieWatchEventAction(
  eventId: string,
  movieProviderId: number,
): Promise<void> {
  await removeMovieWatchEvent(eventId);
  revalidatePath(`/movies/${movieProviderId}`);
  // Removing an event can change whether this movie still appears as
  // "Watched" (or its watch count) on Library and in the Diary — also
  // called as the Diary's own "Delete" action for one specific viewing
  // (see docs/diary.md); no parallel delete path exists there.
  revalidatePath("/library");
  revalidatePath("/library/diary");
}

// The Diary's "Edit watch date" action (see docs/diary.md) — corrects
// exactly one event's `watchedAt`, never its movie identity. Revalidates
// the same surfaces a delete/create does: the date can move where this
// event sits in Movie Details' own history menu, Library's "last
// watched" readout, and the Diary's chronological position/date group.
export async function updateMovieWatchedAtAction(
  eventId: string,
  movieProviderId: number,
  watchedAt: Date,
): Promise<MovieWatchEvent | null> {
  const event = await updateMovieWatchedAt(eventId, watchedAt);
  revalidatePath(`/movies/${movieProviderId}`);
  revalidatePath("/library");
  revalidatePath("/library/diary");
  return event;
}
