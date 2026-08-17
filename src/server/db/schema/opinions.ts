// The personal opinion domain's persistence — see docs/opinions.md for
// the product/domain reasoning. Deliberately separate from Tracking
// (`schema/tracking.ts`): viewing events are facts ("I watched this"),
// this is opinion ("what did I think of it"). Doesn't duplicate TMDB
// metadata (title/poster/genres) — only external identity (`media_type` +
// `media_provider_id`, the same shape `media_planning_items` already
// uses) plus the user's own comment. No `provider` column, same
// reasoning as `tracking.ts`/`planning.ts`: TMDB is the only provider
// this application integrates with today.
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

export const opinionMediaTypeValues = ["movie", "show"] as const;
export type OpinionMediaTypeValue = (typeof opinionMediaTypeValues)[number];

// One current private comment per user+media — never per viewing event
// (see docs/opinions.md, "Comment ownership"). A row only ever exists
// when the comment has real content; an edit that empties the text
// deletes the row rather than persisting an empty one (enforced in
// `server/opinions/`, not just here). Gated in the UI on having actually
// watched (even partially) the title — see docs/opinions.md.
export const mediaComments = pgTable(
  "media_comments",
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
    // Only ever set when `setMediaComment` is called by the import layer
    // *and* no comment already existed (import never overwrites an
    // existing comment — see docs/data-portability.md, "Comments merge").
    // Cleared to null on any real user comment change, same ownership-
    // transfer rule as `movie_watch_events.import_batch_id`.
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mediaType, table.mediaProviderId] }),
    check("media_comments_media_type_check", sql`${table.mediaType} in ('movie', 'show')`),
    check("media_comments_content_not_blank_check", sql`length(trim(${table.content})) > 0`),
    // 4000 chars — a deliberate middle-of-the-range cap (see
    // docs/opinions.md, "Comment length"), enforced at both the domain
    // boundary and here.
    check("media_comments_content_length_check", sql`char_length(${table.content}) <= 4000`),
    // Rollback's own targeted delete — same reasoning as
    // `movie_watch_events_import_batch_idx` (schema/tracking.ts).
    index("media_comments_import_batch_idx").on(table.importBatchId),
  ],
);

export const mediaCommentsRelations = relations(mediaComments, ({ one }) => ({
  user: one(user, { fields: [mediaComments.userId], references: [user.id] }),
}));
