CREATE TABLE "import_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"source_filename" text,
	"import_version" integer NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"counts" jsonb NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "import_batches_source_check" CHECK ("import_batches"."source" in ('medio', 'letterboxd', 'csv')),
	CONSTRAINT "import_batches_status_check" CHECK ("import_batches"."status" in ('completed', 'rolled_back'))
);
--> statement-breakpoint
ALTER TABLE "media_notes" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "media_ratings" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "media_planning_items" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "episode_watch_events" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "movie_watch_events" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "show_tracking_state" ADD COLUMN "import_batch_id" uuid;--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_batches_user_imported_at_idx" ON "import_batches" USING btree ("user_id","imported_at");--> statement-breakpoint
ALTER TABLE "media_notes" ADD CONSTRAINT "media_notes_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_ratings" ADD CONSTRAINT "media_ratings_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_planning_items" ADD CONSTRAINT "media_planning_items_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "episode_watch_events" ADD CONSTRAINT "episode_watch_events_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_watch_events" ADD CONSTRAINT "movie_watch_events_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_tracking_state" ADD CONSTRAINT "show_tracking_state_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "episode_watch_events_import_batch_idx" ON "episode_watch_events" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX "movie_watch_events_import_batch_idx" ON "movie_watch_events" USING btree ("import_batch_id");