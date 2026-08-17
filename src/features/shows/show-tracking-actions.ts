"use server";

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
import { revalidateTrackingSurfaces } from "@/server/mutations/revalidate-tracking-surfaces";

// Thin Server Action wrappers around the tracking domain (see the
// equivalent comment in features/movies/movie-tracking-actions.ts).
// Every write here goes through the one shared
// `revalidateTrackingSurfaces` — see that module's own comment for why:
// any of these can change personalized Home's Up Next/Continue Watching/
// Finish Soon membership (see docs/home.md), Calendar's "New Episode
// Available" release events (see docs/calendar.md), Library's rows/
// progress, Stats' aggregates, and Pick for Me's candidates, since all of
// them read the same unified next-episode/watch-event domain.

export async function startWatchingShowAction(showProviderId: number): Promise<ShowTrackingState> {
  const state = await startWatchingShow(showProviderId);
  revalidateTrackingSurfaces({ showProviderId, affectsDiary: false });
  return state;
}

export async function putShowOnHoldAction(showProviderId: number): Promise<ShowTrackingState> {
  const state = await putShowOnHold(showProviderId);
  revalidateTrackingSurfaces({ showProviderId, affectsDiary: false });
  return state;
}

export async function dropShowAction(showProviderId: number): Promise<ShowTrackingState> {
  const state = await dropShow(showProviderId);
  revalidateTrackingSurfaces({ showProviderId, affectsDiary: false });
  return state;
}

export async function clearShowTrackingStateAction(showProviderId: number): Promise<void> {
  await clearShowTrackingState(showProviderId);
  revalidateTrackingSurfaces({ showProviderId, affectsDiary: false });
}

export async function markEpisodeWatchedAction(input: {
  showProviderId: number;
  seasonNumber: number;
  episodeNumber: number;
  episodeProviderId: number;
  watchedAt?: Date;
}): Promise<EpisodeWatchEvent> {
  const event = await recordEpisodeWatch(input);
  revalidateTrackingSurfaces({
    showProviderId: input.showProviderId,
    seasonNumbers: [input.seasonNumber],
    affectsDiary: true,
  });
  return event;
}

// Resets a show's progress entirely — deletes every episode watch event
// for it (real history, so the caller confirms first — see
// `ShowTrackingControl`). Explicit tracking state is untouched.
export async function resetShowProgressAction(showProviderId: number): Promise<void> {
  await resetShowWatchHistory(showProviderId);
  revalidateTrackingSurfaces({ showProviderId, affectsDiary: true });
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
  revalidateTrackingSurfaces({
    showProviderId: input.showProviderId,
    seasonNumbers: [input.seasonNumber],
    affectsDiary: true,
  });
}

// Removes exactly one episode watch event — the Diary's "Delete" action
// for one specific episode viewing (see docs/diary.md). Deliberately
// different from `unmarkEpisodeWatchedAction`: that toggle removes
// *every* watch event for the episode (episode tracking's plain
// watched/unwatched model — see docs/tracking.md); this removes exactly
// the one event identified by `eventId`, so deleting one rewatch never
// touches the episode's other viewings. Deleting the last remaining
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
  revalidateTrackingSurfaces({
    showProviderId: input.showProviderId,
    seasonNumbers: [input.seasonNumber],
    affectsDiary: true,
  });
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
  revalidateTrackingSurfaces({
    showProviderId: input.showProviderId,
    seasonNumbers: [input.seasonNumber],
    affectsDiary: true,
  });
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
  revalidateTrackingSurfaces({
    showProviderId: input.showProviderId,
    seasonNumbers: [input.seasonNumber],
    affectsDiary: true,
  });
}

// Show Details' whole-show bulk action (see `MarkShowWatchedControl`) —
// marks every remaining aired episode across every regular season
// watched, in one transaction. Revalidates every season page actually
// touched (derived from `input.episodes`), not just the show's own page.
export async function markShowWatchedAction(input: {
  showProviderId: number;
  episodes: readonly { seasonNumber: number; episodeNumber: number; episodeProviderId: number }[];
}): Promise<void> {
  await markShowWatched(input);
  const seasonNumbers = [...new Set(input.episodes.map((episode) => episode.seasonNumber))];
  revalidateTrackingSurfaces({
    showProviderId: input.showProviderId,
    seasonNumbers,
    affectsDiary: true,
  });
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
  revalidateTrackingSurfaces({
    showProviderId: input.showProviderId,
    seasonNumbers: [input.seasonNumber],
    affectsDiary: true,
  });
}
