import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import type { DiaryCursor, DiaryEvent, DiaryFilter, DiarySort } from "./types";

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
}): Promise<{ events: readonly DiaryEvent[]; hasMore: boolean }> {
  const { userId, filter, sort, cursor, limit } = input;

  const typeFilter =
    filter === "movies"
      ? sql`and event_type = 'movie'`
      : filter === "tv"
        ? sql`and event_type = 'episode'`
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
    where 1 = 1 ${typeFilter} ${cursorFilter}
    order by watched_at ${direction}, event_type ${direction}, id ${direction}
    limit ${limit + 1}
  `);

  const rows = result.rows;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return { events: page.map(toDiaryEvent), hasMore };
}
