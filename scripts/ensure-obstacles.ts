import "dotenv/config";
import postgres from "postgres";

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

  console.log("Ensured obstacles table exists.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
