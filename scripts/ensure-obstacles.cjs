const Database = require("better-sqlite3");

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

db.exec(`
  CREATE TABLE IF NOT EXISTS obstacle_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    obstacle_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    label TEXT,
    created_at INTEGER
  );
`);

try {
  db.exec("ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'builder'");
} catch (e) {
  // ignore if column exists
}
db.exec("UPDATE user SET role = 'builder' WHERE role IS NULL OR role = ''");

console.log("Ensured obstacles, obstacle_images, and user.role exist.");
