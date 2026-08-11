import "server-only";
import { listMediaRatings } from "@/server/opinions/ratings";
import { getPlanningIntentsBatch } from "@/server/planning/planning-items";
import { getWatchedMovieIds } from "@/server/tracking/movie-events";
import { getShowTrackingStatusesBatch } from "@/server/tracking/show-state";
import type { MediaPersonalState, MediaType } from "./types";

// The one shared, batched "does the user already have a relationship
// with this title" composition — see docs/media-provider.md, "Personal
// state on public surfaces", and `MediaPersonalState`'s own comment
// (server/media/types.ts) for why the type itself lives in that plain
// module rather than here. Search results and Discover cards both need
// this; Library already has its own richer equivalent
// (`server/library/compose.ts`) built from the user's *own* candidate
// rows, not an arbitrary public result set, so this is deliberately a
// separate, leaner projection rather than a shared abstraction forced
// over both call sites.

function key(mediaType: MediaType, mediaProviderId: number): string {
  return `${mediaType}:${mediaProviderId}`;
}

// One batched composition for a whole visible result set — three small,
// independently-indexed queries in parallel (planning, movie watch
// history, show tracking status) plus the user's rating set, never one
// query per result. Movies and shows are handled uniformly here; a
// caller never needs to branch on media type to use this.
export async function getPersonalStates(
  items: readonly { mediaType: MediaType; mediaProviderId: number }[],
): Promise<ReadonlyMap<string, MediaPersonalState>> {
  if (items.length === 0) return new Map();

  const movieIds = items.filter((item) => item.mediaType === "movie").map((i) => i.mediaProviderId);
  const showIds = items.filter((item) => item.mediaType === "show").map((i) => i.mediaProviderId);

  const [intents, watchedMovieIds, showStatuses, ratings] = await Promise.all([
    getPlanningIntentsBatch(items),
    getWatchedMovieIds(movieIds),
    getShowTrackingStatusesBatch(showIds),
    listMediaRatings(),
  ]);
  const ratingByKey = new Map(
    ratings.map((rating) => [key(rating.mediaType, rating.mediaProviderId), rating.rating]),
  );

  const states = new Map<string, MediaPersonalState>();
  for (const item of items) {
    const itemKey = key(item.mediaType, item.mediaProviderId);

    if (item.mediaType === "movie" && watchedMovieIds.has(item.mediaProviderId)) {
      states.set(itemKey, { kind: "watched", rating: ratingByKey.get(itemKey) ?? null });
      continue;
    }
    if (item.mediaType === "show") {
      const status = showStatuses.get(item.mediaProviderId);
      if (status) {
        states.set(itemKey, { kind: status });
        continue;
      }
    }
    const intent = intents.get(itemKey);
    if (intent) {
      states.set(itemKey, { kind: intent });
      continue;
    }
    states.set(itemKey, { kind: "none" });
  }

  return states;
}
