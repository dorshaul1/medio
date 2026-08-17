ALTER TABLE "media_ratings" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "media_ratings" CASCADE;--> statement-breakpoint
ALTER TABLE "media_notes" RENAME TO "media_comments";--> statement-breakpoint
ALTER TABLE "media_comments" DROP CONSTRAINT "media_notes_media_type_check";--> statement-breakpoint
ALTER TABLE "media_comments" DROP CONSTRAINT "media_notes_content_not_blank_check";--> statement-breakpoint
ALTER TABLE "media_comments" DROP CONSTRAINT "media_notes_content_length_check";--> statement-breakpoint
ALTER TABLE "media_comments" DROP CONSTRAINT "media_notes_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "media_comments" DROP CONSTRAINT "media_notes_import_batch_id_import_batches_id_fk";
--> statement-breakpoint
DROP INDEX "media_notes_import_batch_idx";--> statement-breakpoint
ALTER TABLE "media_comments" DROP CONSTRAINT "media_notes_user_id_media_type_media_provider_id_pk";--> statement-breakpoint
ALTER TABLE "media_comments" ADD CONSTRAINT "media_comments_user_id_media_type_media_provider_id_pk" PRIMARY KEY("user_id","media_type","media_provider_id");--> statement-breakpoint
ALTER TABLE "media_comments" ADD CONSTRAINT "media_comments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_comments" ADD CONSTRAINT "media_comments_import_batch_id_import_batches_id_fk" FOREIGN KEY ("import_batch_id") REFERENCES "public"."import_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_comments_import_batch_idx" ON "media_comments" USING btree ("import_batch_id");--> statement-breakpoint
ALTER TABLE "media_comments" ADD CONSTRAINT "media_comments_media_type_check" CHECK ("media_comments"."media_type" in ('movie', 'show'));--> statement-breakpoint
ALTER TABLE "media_comments" ADD CONSTRAINT "media_comments_content_not_blank_check" CHECK (length(trim("media_comments"."content")) > 0);--> statement-breakpoint
ALTER TABLE "media_comments" ADD CONSTRAINT "media_comments_content_length_check" CHECK (char_length("media_comments"."content") <= 4000);