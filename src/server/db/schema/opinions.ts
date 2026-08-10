// The personal opinion domain's persistence — see docs/opinions.md for
// the product/domain reasoning. Two tables, deliberately separate from
// Tracking (`schema/tracking.ts`): viewing events are facts ("I watched
// this"), these are opinion ("what did I think of it"). Neither
// duplicates TMDB metadata (title/poster/genres) — only external identity
// (`media_type` + `media_provider_id`, the same shape `media_planning_items`
// already uses) plus the user's own opinion data. No `provider` column,
// same reasoning as `tracking.ts`/`planning.ts`: TMDB is the only
// provider this application integrates with today.
import { relations, sql } from "drizzle-orm";
import { check, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { importBatches } from "./import";

export const opinionMediaTypeValues = ["movie", "show"] as const;
export type OpinionMediaTypeValue = (typeof opinionMediaTypeValues)[number];

// One current rating per user+media — never one per viewing event (see
// docs/opinions.md, "Rating ownership"). Rewatching or correcting/
// deleting watch history never touches this row; changing your mind
// later updates it in place.
export const mediaRatings = pgTable(
  "media_ratings",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: opinionMediaTypeValues }).notNull(),
    mediaProviderId: integer("media_provider_id").notNull(),
    // 1-5 integer scale — see docs/opinions.md, "Rating scale". No half
    // ratings.
    rating: integer("rating").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // Only ever set when `setMediaRating` is called by the import layer
    // *and* no rating already existed (import never overwrites an
    // existing rating — see docs/data-portability.md, "Ratings merge").
    // Cleared to null on any real user rating change, same ownership-
    // transfer rule as `movie_watch_events.import_batch_id`.
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mediaType, table.mediaProviderId] }),
    check("media_ratings_media_type_check", sql`${table.mediaType} in ('movie', 'show')`),
    check("media_ratings_rating_range_check", sql`${table.rating} >= 1 and ${table.rating} <= 5`),
  ],
);

// One current private note per user+media — never per viewing event (see
// docs/opinions.md, "Notes ownership"). A row only ever exists when the
// note has real content; an edit that empties the text deletes the row
// rather than persisting an empty one (enforced in `server/opinions/`,
// not just here).
export const mediaNotes = pgTable(
  "media_notes",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: opinionMediaTypeValues }).notNull(),
    mediaProviderId: integer("media_provider_id").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // Same "import never overwrites, only creates when absent" rule as
    // `media_ratings.import_batch_id` — see docs/data-portability.md,
    // "Notes merge".
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mediaType, table.mediaProviderId] }),
    check("media_notes_media_type_check", sql`${table.mediaType} in ('movie', 'show')`),
    check("media_notes_content_not_blank_check", sql`length(trim(${table.content})) > 0`),
    // 4000 chars — a deliberate middle-of-the-range cap (see
    // docs/opinions.md, "Note length"), enforced at both the domain
    // boundary and here.
    check("media_notes_content_length_check", sql`char_length(${table.content}) <= 4000`),
  ],
);

export const mediaRatingsRelations = relations(mediaRatings, ({ one }) => ({
  user: one(user, { fields: [mediaRatings.userId], references: [user.id] }),
}));

export const mediaNotesRelations = relations(mediaNotes, ({ one }) => ({
  user: one(user, { fields: [mediaNotes.userId], references: [user.id] }),
}));
