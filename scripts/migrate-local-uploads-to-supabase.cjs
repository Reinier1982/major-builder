/* eslint-disable @typescript-eslint/no-require-imports */
require("dotenv/config");

const fs = require("fs/promises");
const path = require("path");
const postgres = require("postgres");
const { createClient } = require("@supabase/supabase-js");

const bucket = process.env.SUPABASE_STORAGE_BUCKET || "obstacle-images";
const uploadsDir = process.env.LOCAL_UPLOADS_DIR || path.join(process.cwd(), "public", "uploads");
const supabaseServerKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NEXT_PUBLIC_SUPABASE_URL;

  const match = process.env.DATABASE_URL?.match(/postgres\.([a-z0-9]+):/i);
  if (match?.[1]) return `https://${match[1]}.supabase.co`;

  throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not set.");
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set.");
}

if (!supabaseServerKey) {
  throw new Error("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not set.");
}

if (supabaseServerKey.startsWith("sb_publishable_")) {
  throw new Error(
    "Supabase publishable key provided for server storage migration. Use SUPABASE_SECRET_KEY or legacy SUPABASE_SERVICE_ROLE_KEY instead."
  );
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
  ssl: "require",
});

const supabase = createClient(getSupabaseUrl(), supabaseServerKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function contentTypeForFile(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  if (ext === ".webp") return "image/webp";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

async function ensureBucket() {
  const { data, error } = await supabase.storage.getBucket(bucket);
  if (!error && data) {
    if (!data.public) {
      const { error: updateError } = await supabase.storage.updateBucket(bucket, {
        public: true,
        allowedMimeTypes: ["image/*"],
      });

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return;
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ["image/*"],
  });

  if (createError && createError.message !== "The resource already exists") {
    throw new Error(createError.message);
  }
}

async function main() {
  await ensureBucket();

  const rows = await sql`
    select "id", "obstacle_id", "url"
    from "obstacle_images"
    where "url" like '/uploads/%'
    order by "id"
  `;

  let uploaded = 0;
  let missing = 0;

  for (const row of rows) {
    const fileName = path.basename(row.url);
    const localPath = path.join(uploadsDir, fileName);
    const storagePath = `obstacles/${row.obstacle_id}/${fileName}`;

    let file;
    try {
      file = await fs.readFile(localPath);
    } catch {
      missing += 1;
      console.warn(`Missing local file for image ${row.id}: ${localPath}`);
      continue;
    }

    const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, file, {
      contentType: contentTypeForFile(fileName),
      upsert: true,
    });

    if (uploadError) {
      throw new Error(`Failed to upload ${fileName}: ${uploadError.message}`);
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    await sql`
      update "obstacle_images"
      set "url" = ${data.publicUrl}
      where "id" = ${row.id}
    `;
    uploaded += 1;
  }

  console.log(`Migrated ${uploaded} upload(s) to Supabase Storage.`);
  if (missing > 0) console.log(`Skipped ${missing} missing local file(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
