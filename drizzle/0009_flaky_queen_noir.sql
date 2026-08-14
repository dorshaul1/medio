ALTER TABLE "user_preferences" RENAME COLUMN "home_focus" TO "home_layout";--> statement-breakpoint
ALTER TABLE "user_preferences" DROP CONSTRAINT "user_preferences_home_focus_check";--> statement-breakpoint
UPDATE "user_preferences" SET "home_layout" = 'calendar' WHERE "home_layout" = 'releases';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "show_up_next" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_home_layout_check" CHECK ("user_preferences"."home_layout" in ('balanced', 'personal', 'calendar'));