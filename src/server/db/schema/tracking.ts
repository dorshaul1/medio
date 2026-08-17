// The tracking domain's persistence — see docs/tracking.md for the
// product/domain reasoning behind this shape. Three tables, not one
// polymorphic "everything event" table:
//
// - `movie_watch_events` / `episode_watch_events` — one row per viewing.
//   Movies and TV episodes have different identity structures (a movie
//   needs only its own provider ID; an episode needs its show, season,
//   and episode coordinates), so they get separate tables with real
//   NOT NULL columns rather than one table full of nullable
//   movie-or-episode fields. Multiple rows for the same media are
//   rewatches, not an error — there is deliberately no unique constraint
//   on (user, media, watchedAt).
// - `show_tracking_state` — one row per user+show the user has an
//   *explicit* relationship with (`watching`/`on_hold`/`dropped`).
//   `caught_up`/`waiting`/`completed` are never persisted here — they're
//   derived from event history at read time (see
//   `src/server/tracking/derived-state.ts`).
//
// No `provider` column: TMDB is the only provider this application
// integrates with today, and every ID column here is already
// unambiguously named `*ProviderId` (never a bare `movieId`, which could
// be mistaken for an internal database identity — there is no `movies`
// table; see docs/media-provider.md, "Identifiers"). Adding a `provider`
// column is a purely additive migration if a second provider is ever
// integrated — not a decision that needs to be made speculatively now.
import { relations, sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { importBatches } from "./import";

export const movieWatchEvents = pgTable(
  "movie_watch_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    movieProviderId: integer("movie_provider_id").notNull(),
    // The real moment of viewing — distinct from `createdAt` (when the
    // row was written). Defaults to now, but callers may backdate it.
    watchedAt: timestamp("watched_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // Set only when this row was created by a confirmed import batch —
    // see docs/data-portability.md, "Rollback semantics". `updateMovieWatchedAt`
    // clears this back to null on any real user edit (ownership
    // transfer), so rollback only ever removes rows still solely
    // attributable to the import. Never exposed on `MovieWatchEvent`
    // (audit metadata, not viewing semantics — see CLAUDE.md).
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    // Every movie-scoped read (watch summary, history list) filters by
    // exactly this pair.
    index("movie_watch_events_user_movie_idx").on(table.userId, table.movieProviderId),
    index("movie_watch_events_user_watched_at_idx").on(table.userId, table.watchedAt),
    // Rollback's own targeted delete.
    index("movie_watch_events_import_batch_idx").on(table.importBatchId),
  ],
);

export const episodeWatchEvents = pgTable(
  "episode_watch_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    showProviderId: integer("show_provider_id").notNull(),
    // Season 0 is Specials — a real, valid season (see
    // docs/media-provider.md, "Specials"), so this is >= 0, not > 0.
    seasonNumber: integer("season_number").notNull(),
    episodeNumber: integer("episode_number").notNull(),
    // TMDB's own unique episode ID — the canonical identity for this
    // episode across the show's lifetime. season/episode number are also
    // stored (not derived from a join) so a season/show-scoped tracking
    // query never needs to already know a show's full episode ID list.
    episodeProviderId: integer("episode_provider_id").notNull(),
    watchedAt: timestamp("watched_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    // Same import-provenance/ownership-transfer rule as
    // `movie_watch_events.import_batch_id` — see docs/data-portability.md.
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    check("episode_watch_events_season_number_check", sql`${table.seasonNumber} >= 0`),
    check("episode_watch_events_episode_number_check", sql`${table.episodeNumber} > 0`),
    // Season-page bulk reads: "every watched episode in show X, season Y
    // for this user" — one query, not one per episode.
    index("episode_watch_events_user_show_season_idx").on(
      table.userId,
      table.showProviderId,
      table.seasonNumber,
    ),
    // Single-episode summary (watch count/last watched for one episode).
    index("episode_watch_events_user_episode_idx").on(table.userId, table.episodeProviderId),
    index("episode_watch_events_user_watched_at_idx").on(table.userId, table.watchedAt),
    // Rollback's own targeted delete.
    index("episode_watch_events_import_batch_idx").on(table.importBatchId),
  ],
);

export const showTrackingStatusValues = ["watching", "on_hold", "dropped"] as const;
export type ShowTrackingStatusValue = (typeof showTrackingStatusValues)[number];

export const showTrackingState = pgTable(
  "show_tracking_state",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    showProviderId: integer("show_provider_id").notNull(),
    // Explicit user state only — never `caught_up`/`waiting`/`completed`.
    // See docs/tracking.md.
    status: text("status", { enum: showTrackingStatusValues }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // Same import-provenance/ownership-transfer rule as
    // `movie_watch_events.import_batch_id` — cleared to null by
    // `upsertShowStatus` (i.e. any real `startWatchingShow`/`putShowOnHold`/
    // `dropShow` call) whenever it isn't the import layer itself calling
    // it. See docs/data-portability.md.
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    // One state per user+show — the row's own natural identity, so a
    // composite primary key rather than a surrogate id + separate unique
    // constraint. This table is always looked up/updated by this pair,
    // never referenced elsewhere by an independent stable ID.
    primaryKey({ columns: [table.userId, table.showProviderId] }),
    // Drizzle's `{ enum: [...] }` above is TypeScript-only — it doesn't
    // reach the database. This is the real, persistent invariant.
    check(
      "show_tracking_state_status_check",
      sql`${table.status} in ('watching', 'on_hold', 'dropped')`,
    ),
    // Rollback's own targeted delete — same reasoning as
    // `movie_watch_events_import_batch_idx` above.
    index("show_tracking_state_import_batch_idx").on(table.importBatchId),
  ],
);

export const movieWatchEventsRelations = relations(movieWatchEvents, ({ one }) => ({
  user: one(user, { fields: [movieWatchEvents.userId], references: [user.id] }),
}));

export const episodeWatchEventsRelations = relations(episodeWatchEvents, ({ one }) => ({
  user: one(user, { fields: [episodeWatchEvents.userId], references: [user.id] }),
}));

export const showTrackingStateRelations = relations(showTrackingState, ({ one }) => ({
  user: one(user, { fields: [showTrackingState.userId], references: [user.id] }),
}));
