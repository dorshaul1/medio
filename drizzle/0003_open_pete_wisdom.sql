CREATE TABLE "media_notes" (
	"user_id" text NOT NULL,
	"media_type" text NOT NULL,
	"media_provider_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_notes_user_id_media_type_media_provider_id_pk" PRIMARY KEY("user_id","media_type","media_provider_id"),
	CONSTRAINT "media_notes_media_type_check" CHECK ("media_notes"."media_type" in ('movie', 'show')),
	CONSTRAINT "media_notes_content_not_blank_check" CHECK (length(trim("media_notes"."content")) > 0),
	CONSTRAINT "media_notes_content_length_check" CHECK (char_length("media_notes"."content") <= 4000)
);
--> statement-breakpoint
CREATE TABLE "media_ratings" (
	"user_id" text NOT NULL,
	"media_type" text NOT NULL,
	"media_provider_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_ratings_user_id_media_type_media_provider_id_pk" PRIMARY KEY("user_id","media_type","media_provider_id"),
	CONSTRAINT "media_ratings_media_type_check" CHECK ("media_ratings"."media_type" in ('movie', 'show')),
	CONSTRAINT "media_ratings_rating_range_check" CHECK ("media_ratings"."rating" >= 1 and "media_ratings"."rating" <= 5)
);
--> statement-breakpoint
CREATE TABLE "media_reactions" (
	"user_id" text NOT NULL,
	"media_type" text NOT NULL,
	"media_provider_id" integer NOT NULL,
	"reaction" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_reactions_user_id_media_type_media_provider_id_reaction_pk" PRIMARY KEY("user_id","media_type","media_provider_id","reaction"),
	CONSTRAINT "media_reactions_media_type_check" CHECK ("media_reactions"."media_type" in ('movie', 'show')),
	CONSTRAINT "media_reactions_reaction_check" CHECK ("media_reactions"."reaction" in ('favorite', 'rewatchable', 'fun', 'emotional'))
);
--> statement-breakpoint
ALTER TABLE "media_notes" ADD CONSTRAINT "media_notes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_ratings" ADD CONSTRAINT "media_ratings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_reactions" ADD CONSTRAINT "media_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "media_reactions_user_media_idx" ON "media_reactions" USING btree ("user_id","media_type","media_provider_id");