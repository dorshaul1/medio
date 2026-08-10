import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { showTrackingState } from "@/server/db/schema/tracking";
import type { TasteOverview } from "./types";

// Every query in this file is pure SQL aggregation, explicitly scoped by
// an already-authenticated `userId` (the session boundary lives once in
// `compose.ts`'s `getStatsProfile`, same layering as
// `server/library/candidates.ts`/`server/diary/events.ts`) — no TMDB
// calls, no per-row hydration. See docs/stats.md, "Watch history
// aggregation": Taste Profile's viewing-volume figures never load a full
// event history just to report a count.

type ViewingVolumeRow = {
  unique_movies_watched: number;
  movie_watch_event_count: number;
  unique_episodes_watched: number;
  episode_watch_event_count: number;
  unique_shows_watched: number;
  watched_this_year_count: number;
};

// One round trip, five independent scalar subqueries — each already
// covered by an existing index (`(user_id, movie_provider_id)` /
// `(user_id, episode_provider_id)` / `(user_id, watched_at)` — see
// schema/tracking.ts). A show counts toward `uniqueShowsWatched` only
// once it has at least one *regular* (non-Special) episode watched — see
// docs/stats.md, "Show eligibility for taste".
export async function getViewingVolume(userId: string): Promise<TasteOverview> {
  const result = await db.execute<ViewingVolumeRow>(sql`
    select
      (select count(distinct movie_provider_id)::int from movie_watch_events
        where user_id = ${userId}) as unique_movies_watched,
      (select count(*)::int from movie_watch_events
        where user_id = ${userId}) as movie_watch_event_count,
      (select count(distinct episode_provider_id)::int from episode_watch_events
        where user_id = ${userId}) as unique_episodes_watched,
      (select count(*)::int from episode_watch_events
        where user_id = ${userId}) as episode_watch_event_count,
      (select count(distinct show_provider_id)::int from episode_watch_events
        where user_id = ${userId} and season_number > 0) as unique_shows_watched,
      (
        (select count(*)::int from movie_watch_events
          where user_id = ${userId} and watched_at >= date_trunc('year', now()))
        +
        (select count(*)::int from episode_watch_events
          where user_id = ${userId} and watched_at >= date_trunc('year', now()))
      ) as watched_this_year_count
  `);

  const row = result.rows[0];
  if (!row) throw new Error("Failed to compute viewing volume");

  return {
    uniqueMoviesWatched: row.unique_movies_watched,
    movieWatchEventCount: row.movie_watch_event_count,
    uniqueEpisodesWatched: row.unique_episodes_watched,
    episodeWatchEventCount: row.episode_watch_event_count,
    uniqueShowsWatched: row.unique_shows_watched,
    watchedThisYearCount: row.watched_this_year_count,
  };
}

export type TrackingStateCounts = { watching: number; onHold: number; dropped: number };

// Explicit Show Tracking State counts only — never a derived Caught
// up/Waiting/Completed count, which would require per-show provider
// hydration this domain avoids at Taste's scale (see docs/stats.md,
// "Completion behavior").
export async function getTrackingStateCounts(userId: string): Promise<TrackingStateCounts> {
  const rows = await db
    .select({ status: showTrackingState.status, count: sql<number>`count(*)::int` })
    .from(showTrackingState)
    .where(eq(showTrackingState.userId, userId))
    .groupBy(showTrackingState.status);

  const counts: TrackingStateCounts = { watching: 0, onHold: 0, dropped: 0 };
  for (const row of rows) {
    if (row.status === "watching") counts.watching = row.count;
    else if (row.status === "on_hold") counts.onHold = row.count;
    else if (row.status === "dropped") counts.dropped = row.count;
  }
  return counts;
}

// Every viewing event's `watched_at`, movies and episodes combined,
// bounded to the trailing `months` window — the one place this domain
// fetches raw timestamps rather than a SQL aggregate, needed because the
// viewing timeline buckets by calendar month (a grouping cheaply
// expressible in SQL) but a future weekday/time-of-day view would need
// real per-event instants. Bounding to a recent window (rather than the
// user's entire lifetime) keeps the row count reasonable regardless of
// total history size — see docs/stats.md, "Viewing timeline".
export async function getRecentViewingTimestamps(
  userId: string,
  months: number,
): Promise<readonly Date[]> {
  const result = await db.execute<{ watched_at: string }>(sql`
    select watched_at from movie_watch_events
    where user_id = ${userId}
      and watched_at >= date_trunc('month', now()) - make_interval(months => ${months - 1})
    union all
    select watched_at from episode_watch_events
    where user_id = ${userId}
      and watched_at >= date_trunc('month', now()) - make_interval(months => ${months - 1})
  `);

  return result.rows.map((row) => new Date(row.watched_at));
}
