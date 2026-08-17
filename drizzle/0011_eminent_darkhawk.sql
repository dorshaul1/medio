CREATE INDEX "media_notes_import_batch_idx" ON "media_notes" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX "media_ratings_import_batch_idx" ON "media_ratings" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX "media_planning_items_import_batch_idx" ON "media_planning_items" USING btree ("import_batch_id");--> statement-breakpoint
CREATE INDEX "show_tracking_state_import_batch_idx" ON "show_tracking_state" USING btree ("import_batch_id");