import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { showTrackingState } from "@/server/db/schema/tracking";
import type { StatsRangeBounds } from "./range";
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
};

// A `bounds`-aware `and watched_at >= start and watched_at < end`
// fragment — `null` bounds (all time) adds no filter at all, exactly
// `server/diary/events.ts`'s own `period` filter convention.
function rangeFilter(bounds: StatsRangeBounds) {
  return bounds ? sql`and watched_at >= ${bounds.start} and watched_at < ${bounds.end}` : sql``;
}

// One round trip, five independent scalar subqueries — each already
// covered by an existing index (`(user_id, movie_provider_id)` /
// `(user_id, episode_provider_id)` / `(user_id, watched_at)` — see
// schema/tracking.ts). A show counts toward `uniqueShowsWatched` only
// once it has at least one *regular* (non-Special) episode watched — see
// docs/stats.md, "Show eligibility for taste". `bounds` scopes every
// count to one selected date range (see docs/stats.md, "Date ranges");
// `null` (all time) is the same query this always ran before ranges
// existed.
export async function getViewingVolume(
  userId: string,
  bounds: StatsRangeBounds,
): Promise<TasteOverview> {
  const filter = rangeFilter(bounds);
  const result = await db.execute<ViewingVolumeRow>(sql`
    select
      (select count(distinct movie_provider_id)::int from movie_watch_events
        where user_id = ${userId} ${filter}) as unique_movies_watched,
      (select count(*)::int from movie_watch_events
        where user_id = ${userId} ${filter}) as movie_watch_event_count,
      (select count(distinct episode_provider_id)::int from episode_watch_events
        where user_id = ${userId} ${filter}) as unique_episodes_watched,
      (select count(*)::int from episode_watch_events
        where user_id = ${userId} ${filter}) as episode_watch_event_count,
      (select count(distinct show_provider_id)::int from episode_watch_events
        where user_id = ${userId} and season_number > 0 ${filter}) as unique_shows_watched
  `);

  const row = result.rows[0];
  if (!row) throw new Error("Failed to compute viewing volume");

  return {
    uniqueMoviesWatched: row.unique_movies_watched,
    movieWatchEventCount: row.movie_watch_event_count,
    uniqueEpisodesWatched: row.unique_episodes_watched,
    episodeWatchEventCount: row.episode_watch_event_count,
    uniqueShowsWatched: row.unique_shows_watched,
  };
}

export type TrackingStateCounts = { watching: number; onHold: number; dropped: number };

// Explicit Show Tracking State counts only — never a derived Caught
// up/Waiting/Completed count, which would require per-show provider
// hydration this domain avoids at Taste's scale (see docs/stats.md,
// "Completion behavior"). Deliberately never range-scoped: tracking
// state describes a show's *current* status, not a dated event, so it
// reflects "right now" regardless of the selected Stats range (see
// docs/stats.md, "Date ranges and current-state sections").
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
// bounded to one explicit `[start, end)` range — the one place this
// domain fetches raw timestamps rather than a SQL aggregate, needed
// because the viewing-rhythm chart buckets by calendar month/day (a
// grouping cheaply expressible in SQL, but the bucketing itself lives in
// `timeline.ts` so it stays one pure, testable function). A range is
// always required (never the user's unbounded lifetime) so row count
// stays reasonable regardless of total history size — see docs/stats.md,
// "Viewing timeline".
export async function getViewingTimestampsInRange(
  userId: string,
  bounds: { start: Date; end: Date },
): Promise<readonly Date[]> {
  const result = await db.execute<{ watched_at: string }>(sql`
    select watched_at from movie_watch_events
    where user_id = ${userId} and watched_at >= ${bounds.start} and watched_at < ${bounds.end}
    union all
    select watched_at from episode_watch_events
    where user_id = ${userId} and watched_at >= ${bounds.start} and watched_at < ${bounds.end}
  `);

  return result.rows.map((row) => new Date(row.watched_at));
}

type ActiveYearRow = { year: number };

// Distinct real calendar years (UTC) the user has any watch history in —
// powers the range control's year chips (see docs/stats.md, "Historical
// years"). Bounded by the number of distinct active years, never by
// event count. Same UTC-bucketing basis as every other range boundary in
// this domain — `at time zone 'UTC'` is explicit rather than relying on
// the database connection's own session timezone, so this can never
// silently disagree with `resolveStatsRangeBounds`'s own `Date.UTC(...)`
// boundaries for the same events.
export async function getActiveStatsYears(userId: string): Promise<readonly number[]> {
  const result = await db.execute<ActiveYearRow>(sql`
    select distinct extract(year from watched_at at time zone 'UTC')::int as year
    from (
      select watched_at from movie_watch_events where user_id = ${userId}
      union all
      select watched_at from episode_watch_events where user_id = ${userId}
    ) events
    order by year desc
  `);

  return result.rows.map((row) => row.year);
}

type YearlyActivityRow = { year: number; event_count: number };

// One grouped SQL aggregate — the All time viewing-rhythm chart's data
// source (`computeYearlyActivity`, `timeline.ts`). Never a raw per-event
// timestamp pull across the user's entire lifetime; bounded by the
// number of distinct active years, same as `getActiveStatsYears`.
export async function getYearlyActivityCounts(
  userId: string,
): Promise<readonly { year: number; eventCount: number }[]> {
  const result = await db.execute<YearlyActivityRow>(sql`
    select extract(year from watched_at at time zone 'UTC')::int as year, count(*)::int as event_count
    from (
      select watched_at from movie_watch_events where user_id = ${userId}
      union all
      select watched_at from episode_watch_events where user_id = ${userId}
    ) events
    group by year
  `);

  return result.rows.map((row) => ({ year: row.year, eventCount: row.event_count }));
}
