import "server-only";
import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { episodeWatchEvents } from "@/server/db/schema/tracking";
import type { MediaType } from "@/server/media/types";

// The Personal Library Candidate Query — see docs/library.md, "Candidate
// query and pagination". One paginated, SQL-level UNION across the three
// tables that can make media personally relevant (planning intent, movie
// watch history, explicit show tracking state) instead of fetching a
// user's entire personal history and slicing it in application code. No
// title/poster/provider data lives here — this is identity + personal
// state only; provider metadata is composed afterward, and only for the
// one page of candidates actually being rendered (see `compose.ts`).

export type LibraryCandidateKind =
  | "planned-movie"
  | "watched-movie"
  | "planned-show"
  | "tracked-show";

// Exactly what's stored, never a derived value — `caught_up`/`waiting`/
// `completed` can't be known without provider hydration (per-show season
// data), so they can't be a SQL-level pre-filter without hydrating every
// candidate up front, not just the current page. Same reasoning the
// product spec applies to Library search (title lives in the provider
// layer, not Postgres) applies here to state filtering — see
// docs/library.md, "Why derived states aren't a pre-filter".
export type LibraryRawState =
  | "watchlist"
  | "backlog"
  | "watching"
  | "on_hold"
  | "dropped"
  | "watched";

export type LibrarySort = "recently_active" | "recently_added";

export type LibraryCandidate = {
  kind: LibraryCandidateKind;
  mediaType: MediaType;
  mediaProviderId: number;
  intent: "watchlist" | "backlog" | null;
  trackingStatus: "watching" | "on_hold" | "dropped" | null;
  watchCount: number | null;
  personalActivityAt: Date;
  addedAt: Date;
};

type CandidateRow = {
  kind: string;
  media_type: string;
  media_provider_id: number;
  intent: string | null;
  tracking_status: string | null;
  watch_count: number | null;
  personal_activity_at: Date;
  added_at: Date;
};

function toCandidate(row: CandidateRow): LibraryCandidate {
  return {
    kind: row.kind as LibraryCandidateKind,
    mediaType: row.media_type as MediaType,
    mediaProviderId: row.media_provider_id,
    intent: row.intent as LibraryCandidate["intent"],
    trackingStatus: row.tracking_status as LibraryCandidate["trackingStatus"],
    watchCount: row.watch_count,
    personalActivityAt: row.personal_activity_at,
    addedAt: row.added_at,
  };
}

// One paginated page of a user's personal-media candidates, newest
// activity (or newest addition) first. `hasMore` drives "Load more"
// without a separate COUNT query — fetches one extra row past `limit`
// and checks for it rather than computing a full total.
export async function listLibraryCandidates(input: {
  userId: string;
  mediaType?: MediaType | undefined;
  state?: LibraryRawState | undefined;
  sort: LibrarySort;
  limit: number;
  offset: number;
}): Promise<{ candidates: readonly LibraryCandidate[]; hasMore: boolean }> {
  const { userId, mediaType, state, sort, limit, offset } = input;

  const mediaTypeFilter = mediaType ? sql`and media_type = ${mediaType}` : sql``;

  let stateFilter = sql``;
  if (state === "watchlist" || state === "backlog") {
    stateFilter = sql`and intent = ${state}`;
  } else if (state === "watching" || state === "on_hold" || state === "dropped") {
    stateFilter = sql`and tracking_status = ${state}`;
  } else if (state === "watched") {
    stateFilter = sql`and kind = 'watched-movie'`;
  }

  const orderColumn = sort === "recently_added" ? sql`added_at` : sql`personal_activity_at`;

  const result = await db.execute<CandidateRow>(sql`
    with candidates as (
      select
        case when media_type = 'movie' then 'planned-movie' else 'planned-show' end as kind,
        media_type,
        media_provider_id,
        intent,
        null::text as tracking_status,
        null::int as watch_count,
        updated_at as personal_activity_at,
        created_at as added_at
      from media_planning_items
      where user_id = ${userId}

      union all

      select
        'watched-movie' as kind,
        'movie' as media_type,
        movie_provider_id as media_provider_id,
        null::text as intent,
        null::text as tracking_status,
        count(*)::int as watch_count,
        max(watched_at) as personal_activity_at,
        min(created_at) as added_at
      from movie_watch_events
      where user_id = ${userId}
      group by movie_provider_id

      union all

      select
        'tracked-show' as kind,
        'show' as media_type,
        show_provider_id as media_provider_id,
        null::text as intent,
        status as tracking_status,
        null::int as watch_count,
        updated_at as personal_activity_at,
        created_at as added_at
      from show_tracking_state
      where user_id = ${userId}
    )
    select * from candidates
    where 1 = 1 ${mediaTypeFilter} ${stateFilter}
    order by ${orderColumn} desc
    limit ${limit + 1} offset ${offset}
  `);

  const rows = result.rows;
  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;

  return { candidates: page.map(toCandidate), hasMore };
}

// Bulk, per-show watched-episode counts for this user — one query
// covering every show, not one query per show. Counts distinct
// (season, episode) keys so a rewatch never inflates progress, and
// excludes Specials (season 0) — the same rules `server/tracking/`
// applies on Show Details, kept consistent here (see docs/tracking.md,
// "Progress excludes Specials and future episodes"). Episode tracking
// controls only ever appear on aired episodes (see
// `EpisodeWatchControl`), so a watch event already implies "aired" —
// this never needs a per-episode air-date check itself.
export async function getWatchedEpisodeCountsByShow(
  userId: string,
  showProviderIds: readonly number[],
): Promise<ReadonlyMap<number, number>> {
  if (showProviderIds.length === 0) return new Map();

  const rows = await db
    .select({
      showProviderId: episodeWatchEvents.showProviderId,
      watchedCount: sql<number>`count(distinct (${episodeWatchEvents.seasonNumber}, ${episodeWatchEvents.episodeNumber}))::int`,
    })
    .from(episodeWatchEvents)
    .where(
      and(
        eq(episodeWatchEvents.userId, userId),
        ne(episodeWatchEvents.seasonNumber, 0),
        inArray(episodeWatchEvents.showProviderId, [...showProviderIds]),
      ),
    )
    .groupBy(episodeWatchEvents.showProviderId);

  return new Map(rows.map((row) => [row.showProviderId, row.watchedCount]));
}
