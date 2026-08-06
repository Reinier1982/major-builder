import { boolean, doublePrecision, index, integer, pgTable, primaryKey, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { randomUUID } from "crypto";

export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  name: text("name"),
  email: text("email").notNull(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: text("role").notNull().default("builder"), // 'admin' | 'builder'
});

export const accounts = pgTable(
  "account",
  {
    userId: text("user_id").notNull(),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.provider, t.providerAccountId] }),
  })
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  })
);

// Managed categories shared by every kind of item shown at an event.
export const eventItemTypes = pgTable("event_item_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon").notNull().default("pin"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  slugIdx: uniqueIndex("event_item_types_slug_idx").on(table.slug),
}));

export const eventItems = pgTable("event_items", {
  id: serial("id").primaryKey(),
  typeId: integer("type_id").notNull().references(() => eventItemTypes.id),
  assignedToId: text("assigned_to_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  comments: text("comments"),
  // Retained as a compatibility field for the existing problem workflow.
  problemDescription: text("problem_description"),
  status: text("status").notNull().default("planned"), // planned | in_progress | problem | done
  order: integer("order"),
  locationX: integer("location_x"),
  locationY: integer("location_y"),
  locationLat: doublePrecision("location_lat"),
  locationLng: doublePrecision("location_lng"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
}, (table) => ({
  assignedToIdx: index("event_items_assigned_to_idx").on(table.assignedToId),
}));

export const eventItemImages = pgTable("event_item_images", {
  id: serial("id").primaryKey(),
  eventItemId: integer("event_item_id").notNull().references(() => eventItems.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  label: text("label"),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
