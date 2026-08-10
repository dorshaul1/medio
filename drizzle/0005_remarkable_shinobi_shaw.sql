CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"theme" text DEFAULT 'system' NOT NULL,
	"density" text DEFAULT 'comfortable' NOT NULL,
	"motion" text DEFAULT 'system' NOT NULL,
	"default_save_intent" text DEFAULT 'watchlist' NOT NULL,
	"spoiler_protection" text DEFAULT 'standard' NOT NULL,
	"home_focus" text DEFAULT 'balanced' NOT NULL,
	"discover_default_type" text DEFAULT 'movies' NOT NULL,
	"show_finish_soon" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_preferences_theme_check" CHECK ("user_preferences"."theme" in ('system', 'light', 'dark')),
	CONSTRAINT "user_preferences_density_check" CHECK ("user_preferences"."density" in ('comfortable', 'compact')),
	CONSTRAINT "user_preferences_motion_check" CHECK ("user_preferences"."motion" in ('system', 'full', 'reduced')),
	CONSTRAINT "user_preferences_default_save_intent_check" CHECK ("user_preferences"."default_save_intent" in ('watchlist', 'backlog')),
	CONSTRAINT "user_preferences_spoiler_protection_check" CHECK ("user_preferences"."spoiler_protection" in ('off', 'standard', 'strict')),
	CONSTRAINT "user_preferences_home_focus_check" CHECK ("user_preferences"."home_focus" in ('balanced', 'personal', 'discovery')),
	CONSTRAINT "user_preferences_discover_default_type_check" CHECK ("user_preferences"."discover_default_type" in ('movies', 'shows'))
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;