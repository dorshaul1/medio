"use server";

import { revalidatePath } from "next/cache";
import {
  markSeasonWatched,
  markShowWatched,
  recordEpisodeWatch,
  removeEpisodeWatchEvent,
  resetShowWatchHistory,
  unmarkEpisodeWatched,
  unmarkSeasonWatched,
  updateEpisodeWatchedAt,
} from "@/server/tracking/episode-events";
import {
  clearShowTrackingState,
  dropShow,
  putShowOnHold,
  startWatchingShow,
} from "@/server/tracking/show-state";
import type { EpisodeWatchEvent, ShowTrackingState } from "@/server/tracking/types";

// Thin Server Action wrappers around the tracking domain (see the
// equivalent comment in features/movies/movie-tracking-actions.ts).
// Revalidates the show page, the season page, Home (`/`), and Calendar —
// any of these writes can change personalized Home's Up Next/Continue
// Watching/Finish Soon membership (see docs/home.md) *and* Calendar's
// "New Episode Available" release events (see docs/calendar.md), since
// both read the exact same unified next-episode domain. All revalidated
// together rather than tracking exactly which one a given action affects.

export async function startWatchingShowAction(showProviderId: number): Promise<ShowTrackingState> {
  const state = await startWatchingShow(showProviderId);
  revalidatePath(`/shows/${showProviderId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  // Also called as Library's own "Resume" quick action (see
  // features/library/library-show-quick-action.tsx) — see docs/library.md.
  revalidatePath("/library");
  return state;
}

export async function putShowOnHoldAction(showProviderId: number): Promise<ShowTrackingState> {
  const state = await putShowOnHold(showProviderId);
  revalidatePath(`/shows/${showProviderId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  return state;
}

export async function dropShowAction(showProviderId: number): Promise<ShowTrackingState> {
  const state = await dropShow(showProviderId);
  revalidatePath(`/shows/${showProviderId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  return state;
}

export async function clearShowTrackingStateAction(showProviderId: number): Promise<void> {
  await clearShowTrackingState(showProviderId);
  revalidatePath(`/shows/${showProviderId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function markEpisodeWatchedAction(input: {
  showProviderId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  watchedAt?: Date;
}): Promise<EpisodeWatchEvent> {
  const event = await recordEpisodeWatch(input);
  revalidatePath(`/shows/${input.showProviderId}`);
  revalidatePath(`/shows/${input.showProviderId}/seasons/${input.seasonNumber}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  // Also called as Library's own next-episode quick action (see
  // features/library/library-show-quick-action.tsx) — see docs/library.md.
  revalidatePath("/library");
  return event;
}

// Resets a show's progress entirely — deletes every episode watch event
// for it (real history, so the caller confirms first — see
// `ShowTrackingControl`). Explicit tracking state is untouched.
export async function resetShowProgressAction(showProviderId: number): Promise<void> {
  await resetShowWatchHistory(showProviderId);
  revalidatePath(`/shows/${showProviderId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
}

// Episode tracking is a plain watched/unwatched toggle, not
// event-preserving history — clicking a watched episode again calls this,
// not a history-scoped "undo" (see docs/tracking.md).
export async function unmarkEpisodeWatchedAction(input: {
  episodeProviderId: number;
  showProviderId: number;
  seasonNumber: number;
}): Promise<void> {
  await unmarkEpisodeWatched(input.episodeProviderId);
  revalidatePath(`/shows/${input.showProviderId}`);
  revalidatePath(`/shows/${input.showProviderId}/seasons/${input.seasonNumber}`);
  revalidatePath("/");
  revalidatePath("/calendar");
}

// Removes exactly one episode watch event — the Diary's "Delete" action
// for one specific episode viewing (see docs/diary.md). Deliberately
// different from `unmarkEpisodeWatchedAction`: that toggle removes
// *every* watch event for the episode (episode tracking's plain
// watched/unwatched model — see docs/tracking.md); this removes exactly
// the one event identified by `eventId`, so deleting one rewatch never
// touches the episode's other viewings. Revalidates the same surfaces
// every other episode-history write does — deleting the last remaining
// event for an episode can change Show Details' progress, the Season
// page, Library, and Home's Up Next/Continue Watching/Finish Soon
// membership, none of which are copies that need separate updating —
// they all derive from the event rows at read time (see docs/tracking.md,
// "Derived viewing state is never persisted").
export async function removeEpisodeWatchEventAction(input: {
  eventId: string;
  showProviderId: number;
  seasonNumber: number;
}): Promise<void> {
  await removeEpisodeWatchEvent(input.eventId);
  revalidatePath(`/shows/${input.showProviderId}`);
  revalidatePath(`/shows/${input.showProviderId}/seasons/${input.seasonNumber}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/library");
  revalidatePath("/library/diary");
}

// The Diary's "Edit watch date" action for an episode viewing (see
// docs/diary.md) — corrects exactly one event's `watchedAt`, never its
// show/season/episode identity. A corrected date can change which
// episode reads as "most recently watched" for progress purposes, so
// this revalidates the same surfaces `removeEpisodeWatchEventAction`
// does.
export async function updateEpisodeWatchedAtAction(input: {
  eventId: string;
  showProviderId: number;
  seasonNumber: number;
  watchedAt: Date;
}): Promise<EpisodeWatchEvent | null> {
  const event = await updateEpisodeWatchedAt(input.eventId, input.watchedAt);
  revalidatePath(`/shows/${input.showProviderId}`);
  revalidatePath(`/shows/${input.showProviderId}/seasons/${input.seasonNumber}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/library");
  revalidatePath("/library/diary");
  return event;
}

// Season's own bulk action — marks every remaining aired episode of one
// season watched in a single transaction (see `SeasonWatchControl`).
// Purely additive (never a rewatch, never touches already-watched
// episodes), so — like every other "mark watched" control — it needs no
// confirmation step.
export async function markSeasonWatchedAction(input: {
  showProviderId: number;
  seasonNumber: number;
  episodes: readonly { episodeNumber: number; episodeProviderId: number }[];
}): Promise<void> {
  await markSeasonWatched(input);
  revalidatePath(`/shows/${input.showProviderId}`);
  revalidatePath(`/shows/${input.showProviderId}/seasons/${input.seasonNumber}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/library");
}

// Show Details' whole-show bulk action (see `MarkShowWatchedControl`) —
// marks every remaining aired episode across every regular season
// watched, in one transaction. Only the show's own route is revalidated
// here, same precedent as `resetShowProgressAction`'s equivalent
// whole-show bulk mutation below — an individual season page picks up
// the change on its own next visit.
export async function markShowWatchedAction(input: {
  showProviderId: number;
  episodes: readonly { seasonNumber: number; episodeNumber: number; episodeProviderId: number }[];
}): Promise<void> {
  await markShowWatched(input);
  revalidatePath(`/shows/${input.showProviderId}`);
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/library");
}

// The toggle-back half of `markSeasonWatchedAction` — deletes every
// watch event in the season, real history, so `SeasonWatchControl`
// requires a confirmation step before calling this (see
// docs/tracking.md).
export async function unmarkSeasonWatchedAction(input: {
  showProviderId: number;
  seasonNumber: number;
}): Promise<void> {
  await unmarkSeasonWatched(input);
  revalidatePath(`/shows/${input.showProviderId}`);
  revalidatePath(`/shows/${input.showProviderId}/seasons/${input.seasonNumber}`);
  revalidatePath("/");
  revalidatePath("/calendar");
}
