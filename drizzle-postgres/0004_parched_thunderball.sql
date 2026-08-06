ALTER TABLE "event_items" ADD COLUMN "assigned_to_id" text;--> statement-breakpoint
ALTER TABLE "event_items" ADD CONSTRAINT "event_items_assigned_to_id_user_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "event_items_assigned_to_idx" ON "event_items" USING btree ("assigned_to_id");