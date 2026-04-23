/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");

const Database = require("better-sqlite3");
const postgres = require("postgres");

const sqlitePath = process.env.SQLITE_PATH || "sqlite.db";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set.");
}

const sqlite = new Database(sqlitePath, { readonly: true });
const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
  ssl: "require",
});

const toDate = (value) => {
  if (value === null || value === undefined) return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? new Date(numeric) : null;
};

const rows = (table) => sqlite.prepare(`select * from "${table}"`).all();

async function resetSequence(tx, table, column) {
  await tx`
    select setval(
      pg_get_serial_sequence(${table}, ${column}),
      coalesce((select max(id) from ${tx(table)}), 1),
      (select count(*) > 0 from ${tx(table)})
    )
  `;
}

async function main() {
  const data = {
    users: rows("user"),
    accounts: rows("account"),
    sessions: rows("session"),
    verificationTokens: rows("verificationToken"),
    obstacles: rows("obstacles"),
    obstacleImages: rows("obstacle_images"),
  };

  await sql.begin(async (tx) => {
    for (const user of data.users) {
      await tx`
        insert into "user" ("id", "name", "email", "emailVerified", "image", "role")
        values (
          ${user.id},
          ${user.name},
          ${user.email},
          ${toDate(user.emailVerified)},
          ${user.image},
          ${user.role || "builder"}
        )
        on conflict ("id") do update set
          "name" = excluded."name",
          "email" = excluded."email",
          "emailVerified" = excluded."emailVerified",
          "image" = excluded."image",
          "role" = excluded."role"
      `;
    }

    for (const account of data.accounts) {
      await tx`
        insert into "account" (
          "user_id",
          "type",
          "provider",
          "provider_account_id",
          "refresh_token",
          "access_token",
          "expires_at",
          "token_type",
          "scope",
          "id_token",
          "session_state"
        )
        values (
          ${account.user_id},
          ${account.type},
          ${account.provider},
          ${account.provider_account_id},
          ${account.refresh_token},
          ${account.access_token},
          ${account.expires_at},
          ${account.token_type},
          ${account.scope},
          ${account.id_token},
          ${account.session_state}
        )
        on conflict ("provider", "provider_account_id") do update set
          "user_id" = excluded."user_id",
          "type" = excluded."type",
          "refresh_token" = excluded."refresh_token",
          "access_token" = excluded."access_token",
          "expires_at" = excluded."expires_at",
          "token_type" = excluded."token_type",
          "scope" = excluded."scope",
          "id_token" = excluded."id_token",
          "session_state" = excluded."session_state"
      `;
    }

    for (const session of data.sessions) {
      await tx`
        insert into "session" ("session_token", "user_id", "expires")
        values (${session.session_token}, ${session.user_id}, ${toDate(session.expires)})
        on conflict ("session_token") do update set
          "user_id" = excluded."user_id",
          "expires" = excluded."expires"
      `;
    }

    for (const token of data.verificationTokens) {
      await tx`
        insert into "verificationToken" ("identifier", "token", "expires")
        values (${token.identifier}, ${token.token}, ${toDate(token.expires)})
        on conflict ("identifier", "token") do update set
          "expires" = excluded."expires"
      `;
    }

    for (const obstacle of data.obstacles) {
      await tx`
        insert into "obstacles" (
          "id",
          "name",
          "description",
          "problem_description",
          "status",
          "order",
          "created_at",
          "updated_at"
        )
        values (
          ${obstacle.id},
          ${obstacle.name},
          ${obstacle.description},
          ${obstacle.problem_description},
          ${obstacle.status},
          ${obstacle.order},
          ${toDate(obstacle.created_at)},
          ${toDate(obstacle.updated_at)}
        )
        on conflict ("id") do update set
          "name" = excluded."name",
          "description" = excluded."description",
          "problem_description" = excluded."problem_description",
          "status" = excluded."status",
          "order" = excluded."order",
          "created_at" = excluded."created_at",
          "updated_at" = excluded."updated_at"
      `;
    }

    for (const image of data.obstacleImages) {
      await tx`
        insert into "obstacle_images" ("id", "obstacle_id", "url", "label", "uploaded_by", "created_at")
        values (
          ${image.id},
          ${image.obstacle_id},
          ${image.url},
          ${image.label},
          ${image.uploaded_by},
          ${toDate(image.created_at)}
        )
        on conflict ("id") do update set
          "obstacle_id" = excluded."obstacle_id",
          "url" = excluded."url",
          "label" = excluded."label",
          "uploaded_by" = excluded."uploaded_by",
          "created_at" = excluded."created_at"
      `;
    }

    await resetSequence(tx, "obstacles", "id");
    await resetSequence(tx, "obstacle_images", "id");
  });

  console.log(`Imported ${data.users.length} user(s).`);
  console.log(`Imported ${data.sessions.length} session(s).`);
  console.log(`Imported ${data.verificationTokens.length} verification token(s).`);
  console.log(`Imported ${data.obstacles.length} obstacle(s).`);
  console.log(`Imported ${data.obstacleImages.length} obstacle image(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    sqlite.close();
    await sql.end();
  });
