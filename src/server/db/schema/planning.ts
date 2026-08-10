// Planning persistence — see docs/library.md for the product/domain
// reasoning. One table, `media_planning_items`: a user's future-intent
// relationship with one piece of media (Watchlist/Backlog), completely
// separate from Tracking's watch history and explicit show state (see
// `schema/tracking.ts`). Planning rows carry only external identity + the
// user's intent — never title/artwork/genre metadata (that stays TMDB's,
// composed at the application layer; see docs/media-provider.md).
//
// Composite primary key on (user, media type, provider id) — like
// `show_tracking_state`, this row's own natural identity *is* that triple:
// a user has at most one current planning entry per piece of media, it's
// always looked up/updated by that triple, and nothing else ever
// references it by an independent id (see docs/database.md,
// "Identifiers"). Moving Watchlist -> Backlog updates this same row
// in place — never a second, contradictory row for the same media.
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

export const planningMediaTypeValues = ["movie", "show"] as const;
export type PlanningMediaTypeValue = (typeof planningMediaTypeValues)[number];

export const planningIntentValues = ["watchlist", "backlog"] as const;
export type PlanningIntentValue = (typeof planningIntentValues)[number];

export const mediaPlanningItems = pgTable(
  "media_planning_items",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    mediaType: text("media_type", { enum: planningMediaTypeValues }).notNull(),
    mediaProviderId: integer("media_provider_id").notNull(),
    // Watchlist ("interested, save for later") vs. Backlog ("actively
    // intend to get to this") — see docs/library.md. Not a richer intent
    // enum (Soon/Someday/...) yet.
    intent: text("intent", { enum: planningIntentValues }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // Same import-provenance/ownership-transfer rule as
    // `movie_watch_events.import_batch_id` — cleared to null by
    // `upsertPlanningIntent` (any real Save/"Move to..." action) whenever
    // it isn't the import layer itself calling it. See
    // docs/data-portability.md.
    importBatchId: uuid("import_batch_id").references(() => importBatches.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.mediaType, table.mediaProviderId] }),
    // Drizzle's `{ enum: [...] }` above is TypeScript-only — these are the
    // real, persistent invariants.
    check("media_planning_items_media_type_check", sql`${table.mediaType} in ('movie', 'show')`),
    check("media_planning_items_intent_check", sql`${table.intent} in ('watchlist', 'backlog')`),
    // "All of a user's Watchlist" / "all of a user's Backlog" — the
    // Library's state-filtered planning reads.
    index("media_planning_items_user_intent_idx").on(table.userId, table.intent),
    // Library's default "recently active" ordering.
    index("media_planning_items_user_updated_at_idx").on(table.userId, table.updatedAt),
  ],
);

export const mediaPlanningItemsRelations = relations(mediaPlanningItems, ({ one }) => ({
  user: one(user, { fields: [mediaPlanningItems.userId], references: [user.id] }),
}));
