CREATE TABLE "event_item_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text DEFAULT 'pin' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX "event_item_types_slug_idx" ON "event_item_types" USING btree ("slug");--> statement-breakpoint
CREATE TABLE "event_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"type_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"comments" text,
	"problem_description" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"order" integer,
	"location_x" integer,
	"location_y" integer,
	"location_lat" double precision,
	"location_lng" double precision,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "event_item_images" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_item_id" integer NOT NULL,
	"url" text NOT NULL,
	"label" text,
	"uploaded_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "event_items" ADD CONSTRAINT "event_items_type_id_event_item_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."event_item_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_item_images" ADD CONSTRAINT "event_item_images_event_item_id_event_items_id_fk" FOREIGN KEY ("event_item_id") REFERENCES "public"."event_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "event_item_types" ("slug", "name", "description", "icon")
VALUES ('obstacle', 'Obstakel', 'Obstakels voor het evenement', 'obstacle');--> statement-breakpoint
INSERT INTO "event_items" (
	"id", "type_id", "name", "description", "comments", "problem_description", "status", "order",
	"location_x", "location_y", "location_lat", "location_lng", "created_at", "updated_at"
)
SELECT
	o."id", t."id", o."name", o."description", NULL, o."problem_description", o."status", o."order",
	o."location_x", o."location_y", o."location_lat", o."location_lng", COALESCE(o."created_at", now()), COALESCE(o."updated_at", now())
FROM "obstacles" o
CROSS JOIN "event_item_types" t
WHERE t."slug" = 'obstacle';--> statement-breakpoint
INSERT INTO "event_item_images" ("id", "event_item_id", "url", "label", "uploaded_by", "created_at")
SELECT "id", "obstacle_id", "url", "label", "uploaded_by", COALESCE("created_at", now())
FROM "obstacle_images";--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('event_items', 'id'), COALESCE((SELECT MAX("id") FROM "event_items"), 1), EXISTS (SELECT 1 FROM "event_items"));--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('event_item_images', 'id'), COALESCE((SELECT MAX("id") FROM "event_item_images"), 1), EXISTS (SELECT 1 FROM "event_item_images"));--> statement-breakpoint
DROP TABLE "obstacle_images";--> statement-breakpoint
DROP TABLE "obstacles";
