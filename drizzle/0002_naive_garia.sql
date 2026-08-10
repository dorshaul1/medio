CREATE TABLE "media_planning_items" (
	"user_id" text NOT NULL,
	"media_type" text NOT NULL,
	"media_provider_id" integer NOT NULL,
	"intent" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_planning_items_user_id_media_type_media_provider_id_pk" PRIMARY KEY("user_id","media_type","media_provider_id"),
	CONSTRAINT "media_planning_items_media_type_check" CHECK ("media_planning_items"."media_type" in ('movie', 'show')),
	CONSTRAINT "media_planning_items_intent_check" CHECK ("media_planning_items"."intent" in ('watchlist', 'backlog'))
);
--> statement-breakpoint
ALTER TABLE "media_planning_items" ADD CONSTRAINT "media_planning_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_planning_items_user_intent_idx" ON "media_planning_items" USING btree ("user_id","intent");--> statement-breakpoint
CREATE INDEX "media_planning_items_user_updated_at_idx" ON "media_planning_items" USING btree ("user_id","updated_at");