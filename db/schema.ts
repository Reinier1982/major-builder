import { integer, pgTable, primaryKey, serial, text, timestamp } from "drizzle-orm/pg-core";
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

// Obstacles tracked for the obstacle run build
export const obstacles = pgTable("obstacles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  problemDescription: text("problem_description"),
  status: text("status").notNull().default("planned"), // planned | in_progress | problem | done
  order: integer("order"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow(),
});

export const obstacleImages = pgTable("obstacle_images", {
  id: serial("id").primaryKey(),
  obstacleId: integer("obstacle_id").notNull(),
  url: text("url").notNull(),
  label: text("label"),
  uploadedBy: text("uploaded_by"),
  createdAt: timestamp("created_at", { mode: "date" }).defaultNow(),
});
