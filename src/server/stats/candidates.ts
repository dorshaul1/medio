import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { StatsRangeBounds } from "./range";
import type { MovieRewatchAggregate, ShowRewatchAggregate } from "./types";

// Grouped SQL aggregates over the user's watch history — one query per
// table, never one row per viewing event and never one query per title.
// This is the same "group/count in Postgres, not in application code"
// discipline `server/library/candidates.ts` and `server/diary/events.ts`
// already apply (see docs/stats.md, "Watch history aggregation").
// Result-set size is bounded by the user's number of *unique* titles
// watched *within the selected range*, not their lifetime event count —
// cheap even for a user with thousands of rewatches of a handful of
// shows. `bounds` (see docs/stats.md, "Date ranges") scopes which
// watch events count at all — `null` (all time) is the original
// unbounded query.

function rangeFilter(bounds: StatsRangeBounds) {
  return bounds ? sql`and watched_at >= ${bounds.start} and watched_at < ${bounds.end}` : sql``;
}

type MovieAggregateRow = {
  movie_provider_id: number;
  watch_count: number;
  last_watched_at: string;
};

export async function getMovieWatchAggregates(
  userId: string,
  bounds: StatsRangeBounds,
): Promise<readonly MovieRewatchAggregate[]> {
  const filter = rangeFilter(bounds);
  const result = await db.execute<MovieAggregateRow>(sql`
    select movie_provider_id, count(*)::int as watch_count, max(watched_at) as last_watched_at
    from movie_watch_events
    where user_id = ${userId} ${filter}
    group by movie_provider_id
  `);

  return result.rows.map((row) => ({
    movieProviderId: row.movie_provider_id,
    watchCount: row.watch_count,
    lastWatchedAt: new Date(row.last_watched_at),
  }));
}

export type ShowWatchAggregate = ShowRewatchAggregate & {
  watchedEpisodeCount: number;
  // Every episode watch event for this show, Specials included — used
  // only for the viewing-time estimate (see docs/stats.md).
  totalEpisodeEvents: number;
  lastActivityAt: Date;
};

// Only shows meeting title-level eligibility (>= one regular episode
// watched — see docs/stats.md, "Show eligibility for taste") *within the
// selected range* are returned at all. `rewatchedEpisodeCount` includes
// Specials (a rewatched Special is still a real rewatch), but
// eligibility itself never counts them, matching Tracking's own
// "Specials never count toward the denominator" rule (see
// docs/tracking.md).
export async function getShowWatchAggregates(
  userId: string,
  bounds: StatsRangeBounds,
): Promise<readonly ShowWatchAggregate[]> {
  const filter = rangeFilter(bounds);
  const result = await db.execute<{
    show_provider_id: number;
    watched_regular_episodes: number;
    total_episode_events: number;
    watched_episodes_all: number;
    last_activity_at: string;
  }>(sql`
    select
      show_provider_id,
      count(distinct episode_provider_id) filter (where season_number > 0)::int
        as watched_regular_episodes,
      count(*)::int as total_episode_events,
      count(distinct episode_provider_id)::int as watched_episodes_all,
      max(watched_at) as last_activity_at
    from episode_watch_events
    where user_id = ${userId} ${filter}
    group by show_provider_id
    having count(*) filter (where season_number > 0) > 0
  `);

  return result.rows.map((row) => ({
    showProviderId: row.show_provider_id,
    watchedEpisodeCount: row.watched_regular_episodes,
    rewatchedEpisodeCount: row.total_episode_events - row.watched_episodes_all,
    totalEpisodeEvents: row.total_episode_events,
    lastActivityAt: new Date(row.last_activity_at),
  }));
}
