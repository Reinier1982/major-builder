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
  await sql`
    create table if not exists "obstacles" (
      "id" serial primary key,
      "name" text not null,
      "description" text,
      "problem_description" text,
      "status" text not null default 'planned',
      "order" integer,
      "created_at" timestamp default now(),
      "updated_at" timestamp default now()
    )
  `;

  await sql`
    create table if not exists "obstacle_images" (
      "id" serial primary key,
      "obstacle_id" integer not null,
      "url" text not null,
      "label" text,
      "uploaded_by" text,
      "created_at" timestamp default now()
    )
  `;

  await sql`alter table "user" add column if not exists "role" text default 'builder' not null`;
  await sql`update "user" set "role" = 'builder' where "role" is null or "role" = ''`;

  console.log("Ensured obstacles, obstacle_images, and user.role exist.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
