/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");

const postgres = require("postgres");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: "require",
});

async function main() {
  await sql`alter table "user" add column if not exists "role" text default 'builder' not null`;
  const result = await sql`update "user" set "role" = 'admin'`;
  const rows = await sql`select "id", "email", "role" from "user" order by "email"`;

  console.log(`Updated ${result.count} row(s). Current users:`);
  for (const row of rows) {
    console.log(`- ${row.email} (${row.id}): ${row.role}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
