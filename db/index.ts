import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";

// SQLite database file at project root
const sqlite = new Database("sqlite.db");

// Provide schema for proper typing with adapters
export const db = drizzle(sqlite, { schema });
export default db;
