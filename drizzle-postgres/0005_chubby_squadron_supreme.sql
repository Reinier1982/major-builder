CREATE TABLE "event_item_builders" (
	"event_item_id" integer NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "event_item_builders_event_item_id_user_id_pk" PRIMARY KEY("event_item_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "event_items" DROP CONSTRAINT "event_items_assigned_to_id_user_id_fk";
--> statement-breakpoint
DROP INDEX "event_items_assigned_to_idx";--> statement-breakpoint
ALTER TABLE "event_item_builders" ADD CONSTRAINT "event_item_builders_event_item_id_event_items_id_fk" FOREIGN KEY ("event_item_id") REFERENCES "public"."event_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_item_builders" ADD CONSTRAINT "event_item_builders_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_item_builders_user_idx" ON "event_item_builders" USING btree ("user_id");--> statement-breakpoint
INSERT INTO "event_item_builders" ("event_item_id", "user_id")
SELECT "id", "assigned_to_id"
FROM "event_items"
WHERE "assigned_to_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "event_items" DROP COLUMN "assigned_to_id";
