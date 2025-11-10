const Database = require("better-sqlite3");

const db = new Database("sqlite.db");

try {
  // Ensure role column exists (no-op if already there)
  db.exec("ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'builder'");
} catch (_) {}

const stmt = db.prepare("UPDATE user SET role = 'admin'");
const info = stmt.run();

const rows = db.prepare("SELECT id, email, role FROM user").all();
console.log(`Updated ${info.changes} row(s). Current users:`);
for (const r of rows) {
  console.log(`- ${r.email} (${r.id}): ${r.role}`);
}

