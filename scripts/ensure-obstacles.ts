import Database from "better-sqlite3";

const db = new Database("sqlite.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS obstacles (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'planned',
    "order" INTEGER,
    created_at INTEGER,
    updated_at INTEGER
  );
`);

console.log("Ensured obstacles table exists.");

