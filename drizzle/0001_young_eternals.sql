CREATE TABLE "episode_watch_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"show_provider_id" integer NOT NULL,
	"season_number" integer NOT NULL,
	"episode_number" integer NOT NULL,
	"episode_provider_id" integer NOT NULL,
	"watched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "episode_watch_events_season_number_check" CHECK ("episode_watch_events"."season_number" >= 0),
	CONSTRAINT "episode_watch_events_episode_number_check" CHECK ("episode_watch_events"."episode_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "movie_watch_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"movie_provider_id" integer NOT NULL,
	"watched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "show_tracking_state" (
	"user_id" text NOT NULL,
	"show_provider_id" integer NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "show_tracking_state_user_id_show_provider_id_pk" PRIMARY KEY("user_id","show_provider_id"),
	CONSTRAINT "show_tracking_state_status_check" CHECK ("show_tracking_state"."status" in ('watching', 'on_hold', 'dropped'))
);
--> statement-breakpoint
ALTER TABLE "episode_watch_events" ADD CONSTRAINT "episode_watch_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movie_watch_events" ADD CONSTRAINT "movie_watch_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_tracking_state" ADD CONSTRAINT "show_tracking_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "episode_watch_events_user_show_season_idx" ON "episode_watch_events" USING btree ("user_id","show_provider_id","season_number");--> statement-breakpoint
CREATE INDEX "episode_watch_events_user_episode_idx" ON "episode_watch_events" USING btree ("user_id","episode_provider_id");--> statement-breakpoint
CREATE INDEX "episode_watch_events_user_watched_at_idx" ON "episode_watch_events" USING btree ("user_id","watched_at");--> statement-breakpoint
CREATE INDEX "movie_watch_events_user_movie_idx" ON "movie_watch_events" USING btree ("user_id","movie_provider_id");--> statement-breakpoint
CREATE INDEX "movie_watch_events_user_watched_at_idx" ON "movie_watch_events" USING btree ("user_id","watched_at");