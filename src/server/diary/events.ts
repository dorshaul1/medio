import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import type {
  DiaryCursor,
  DiaryEvent,
  DiaryFilter,
  DiaryMonthActivity,
  DiaryPeriod,
  DiarySort,
} from "./types";

// `db.execute()`'s raw path doesn't go through Drizzle's own
// column-mode-aware result mapping (that only applies to its typed query
// builder), so timestamp columns come back as raw Postgres text (e.g.
// `"2026-08-08 22:02:07.926+00"`), never a parsed `Date` — every
// timestamp field is explicitly `new Date(...)`'d below rather than
// trusted as already-a-Date. `ordinal` is cast to `::int` in SQL so it
// comes back as a real number rather than `bigint`'s default string
// representation.
type DiaryEventRow = {
  event_type: "movie" | "episode";
  id: string;
  movie_provider_id: number | null;
  show_provider_id: number | null;
  season_number: number | null;
  episode_number: number | null;
  episode_provider_id: number | null;
  watched_at: string;
  ordinal: number;
};

function toDiaryEvent(row: DiaryEventRow): DiaryEvent {
  const watchedAt = new Date(row.watched_at);

  if (row.event_type === "movie") {
    if (row.movie_provider_id === null) {
      throw new Error("Malformed movie diary event row: missing movie_provider_id");
    }
    return {
      eventType: "movie",
      id: row.id,
      movieProviderId: row.movie_provider_id,
      watchedAt,
      ordinal: row.ordinal,
    };
  }

  if (
    row.show_provider_id === null ||
    row.season_number === null ||
    row.episode_number === null ||
    row.episode_provider_id === null
  ) {
    throw new Error("Malformed episode diary event row: missing episode identity");
  }
  return {
    eventType: "episode",
    id: row.id,
    showProviderId: row.show_provider_id,
    seasonNumber: row.season_number,
    episodeNumber: row.episode_number,
    episodeProviderId: row.episode_provider_id,
    watchedAt,
    ordinal: row.ordinal,
  };
}

// The Watch Diary's one cross-type chronological query — see
// docs/diary.md, "Unified chronology". A single SQL-level `UNION ALL`
// across `movie_watch_events`/`episode_watch_events`, the same strategy
// `server/library/candidates.ts` already uses to combine independent
// tables into one paginated result (see docs/library.md, "Candidate
// query and pagination") — never fetch-N-of-each-then-concatenate in
// application code, which can't paginate correctly across two
// independently-ordered sources.
//
// Pagination is real keyset (cursor) pagination, never `OFFSET`:
// `(watched_at, event_type, id)` is one fully-ordered tuple — `id` is
// the final tie-breaker, since more than one event can share the exact
// same `watched_at` — and a page boundary is "the next tuple strictly
// past the cursor," not a row count. That stays correct and stable even
// if rows are inserted or deleted between page loads, and two
// same-`watchedAt` events can never be dropped, duplicated, or swap
// order between requests (see docs/diary.md, "Cursor pagination").
//
// `ordinal` is computed by a window function *before* the cursor/limit
// are applied: `row_number()` partitioned by the media's own identity
// (a movie's provider id; an episode's provider id), ordered
// chronologically — so a rewatch's ordinal reflects the user's *entire*
// history for that title/episode, never just what happens to be on the
// current page (see docs/diary.md, "Rewatch ordinal"). This runs once
// per query, not once per row returned — no N+1 — and Postgres can
// group each partition efficiently using the existing
// `(user_id, movie_provider_id)` / `(user_id, episode_provider_id)`
// indexes already in place for this exact access shape (see
// `schema/tracking.ts`).
export async function listDiaryEvents(input: {
  userId: string;
  filter: DiaryFilter;
  sort: DiarySort;
  cursor: DiaryCursor | null;
  limit: number;
  // Bounds the query to one calendar month (UTC — see `DiaryPeriod`'s own
  // comment) when a Diary page is scoped to one, so a large history never
  // requires paging through everything before the requested period to
  // reach it (see docs/diary.md, "Month-scoped querying"). Omitted/`null`
  // queries the entire history, unbounded — used by tests and by the
  // activity aggregate below. Never affects `ordinal`, which is always
  // computed over the partition's *entire* history regardless of this
  // filter (applied only in the final `where`, never inside the
  // `movie_events`/`episode_events` CTEs — see the comment above this
  // function).
  period?: DiaryPeriod | null;
}): Promise<{ events: readonly DiaryEvent[]; hasMore: boolean }> {
  const { userId, filter, sort, cursor, limit } = input;
  const period = input.period ?? null;

  const typeFilter =
    filter === "movies"
      ? sql`and event_type = 'movie'`
      : filter === "tv"
        ? sql`and event_type = 'episode'`
        : sql``;

  const periodFilter = period
    ? sql`and watched_at >= ${new Date(Date.UTC(period.year, period.month - 1, 1))} and watched_at < ${new Date(Date.UTC(period.year, period.month, 1))}`
    : sql``;

  // Every ORDER BY column and the cursor's tuple comparison use the same
  // direction — the standard requirement for a multi-column keyset
  // boundary to stay correct in both "newest first" and "oldest first"
  // modes.
  const compare = sort === "oldest" ? sql`>` : sql`<`;
  const direction = sort === "oldest" ? sql`asc` : sql`desc`;

  const cursorFilter = cursor
    ? sql`and (watched_at, event_type, id) ${compare} (${cursor.watchedAt}, ${cursor.eventType}, ${cursor.id})`
    : sql``;

  const result = await db.execute<DiaryEventRow>(sql`
    with movie_events as (
      select
        id,
        movie_provider_id,
        watched_at,
        (row_number() over (
          partition by movie_provider_id order by watched_at asc, id asc
        ))::int as ordinal
      from movie_watch_events
      where user_id = ${userId}
    ),
    episode_events as (
      select
        id,
        show_provider_id,
        season_number,
        episode_number,
        episode_provider_id,
        watched_at,
        (row_number() over (
          partition by episode_provider_id order by watched_at asc, id asc
        ))::int as ordinal
      from episode_watch_events
      where user_id = ${userId}
    ),
    combined as (
      select
        'movie'::text as event_type,
        id::text as id,
        movie_provider_id,
        null::int as show_provider_id,
        null::int as season_number,
        null::int as episode_number,
        null::int as episode_provider_id,
        watched_at,
        ordinal
      from movie_events

      union all

      select
        'episode'::text as event_type,
        id::text as id,
        null::int as movie_provider_id,
        show_provider_id,
        season_number,
        episode_number,
        episode_provider_id,
        watched_at,
        ordinal
      from episode_events
    )
    select * from combined
    where 1 = 1 ${typeFilter} ${periodFilter} ${cursorFilter}
    order by watched_at ${direction}, event_type ${direction}, id ${direction}
    limit ${limit + 1}
  `);

  const rows = result.rows;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return { events: page.map(toDiaryEvent), hasMore };
}

type ActivityRow = {
  year: number;
  month: number;
  movie_count: number;
  episode_count: number;
};

// One small aggregate query — grouped by real (year, month) buckets that
// actually have at least one event, never one row per event — that
// serves three separate Diary 2.0 UI needs at once (see
// docs/diary.md, "Month navigation and timezone"): which years get
// offered in the year picker, which months within a year have real
// history (so the picker can visually distinguish them from empty
// months), and the current month's own "N movies · N episodes" overview
// line. Result-set size is bounded by the number of distinct months the
// user has ever watched something in — a 20-year daily viewer is still
// only a few hundred rows, not thousands/millions. Bucketed by UTC
// calendar month, the same documented simplification `listDiaryEvents`'s
// own `period` filter and `server/stats/timeline.ts` already use.
export async function getDiaryActivityCalendar(
  userId: string,
): Promise<readonly DiaryMonthActivity[]> {
  const result = await db.execute<ActivityRow>(sql`
    with movie_counts as (
      select
        extract(year from watched_at)::int as year,
        extract(month from watched_at)::int as month,
        count(*)::int as movie_count
      from movie_watch_events
      where user_id = ${userId}
      group by 1, 2
    ),
    episode_counts as (
      select
        extract(year from watched_at)::int as year,
        extract(month from watched_at)::int as month,
        count(*)::int as episode_count
      from episode_watch_events
      where user_id = ${userId}
      group by 1, 2
    )
    select
      coalesce(m.year, e.year) as year,
      coalesce(m.month, e.month) as month,
      coalesce(m.movie_count, 0) as movie_count,
      coalesce(e.episode_count, 0) as episode_count
    from movie_counts m
    full outer join episode_counts e on m.year = e.year and m.month = e.month
    order by year desc, month desc
  `);

  return result.rows.map((row) => ({
    year: row.year,
    month: row.month,
    movieCount: row.movie_count,
    episodeCount: row.episode_count,
  }));
}
