// Import Batch persistence — see docs/data-portability.md. An
// `import_batches` row is the one durable, auditable record of a
// confirmed import: who ran it, from what source, when, and how many
// records of each kind it created. It is never deleted by rollback (the
// audit trail must survive its own undo) — rollback only flips `status`
// and removes the exact rows it's still safely attributable to (see
// `import_batch_id` below).
import { relations, sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

export const importSourceValues = ["medio", "letterboxd", "csv"] as const;
export type ImportSourceValue = (typeof importSourceValues)[number];

export const importBatchStatusValues = ["completed", "rolled_back"] as const;
export type ImportBatchStatusValue = (typeof importBatchStatusValues)[number];

export const importBatches = pgTable(
  "import_batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source", { enum: importSourceValues }).notNull(),
    // The uploaded file's own name — display metadata only ("Letterboxd
    // diary.csv, Aug 10, 2026"), never used for identity/parsing.
    sourceFilename: text("source_filename"),
    // This app's own import-plan schema version (see
    // `server/import/types.ts`) — lets a future version of the planner
    // change without breaking how an old batch's counts are read back.
    importVersion: integer("import_version").notNull(),
    status: text("status", { enum: importBatchStatusValues }).notNull().default("completed"),
    // Per-domain created-record counts at confirmation time — display-
    // only summary data (see docs/data-portability.md, "Import Batches"),
    // never re-derived by counting `import_batch_id` matches at read
    // time (those rows may have since been edited/detached — see
    // `movie_watch_events.import_batch_id`). A plain jsonb bag rather
    // than one column per domain: this is a fixed-shape but display-only
    // snapshot, not something ever queried by an individual field.
    counts: jsonb("counts").notNull(),
    importedAt: timestamp("imported_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("import_batches_source_check", sql`${table.source} in ('medio', 'letterboxd', 'csv')`),
    check("import_batches_status_check", sql`${table.status} in ('completed', 'rolled_back')`),
    // Settings → Data's "recent imports" list and the rollback lookup
    // both filter by user, most recent first.
    index("import_batches_user_imported_at_idx").on(table.userId, table.importedAt),
  ],
);

export const importBatchesRelations = relations(importBatches, ({ one }) => ({
  user: one(user, { fields: [importBatches.userId], references: [user.id] }),
}));
