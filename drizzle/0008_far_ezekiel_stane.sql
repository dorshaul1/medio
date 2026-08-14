ALTER TABLE "user_preferences" DROP CONSTRAINT "user_preferences_home_focus_check";--> statement-breakpoint
UPDATE "user_preferences" SET "home_focus" = 'balanced' WHERE "home_focus" = 'discovery';--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_home_focus_check" CHECK ("user_preferences"."home_focus" in ('balanced', 'personal', 'releases'));