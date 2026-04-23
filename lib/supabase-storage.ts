import { createClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "obstacle-images";

function getSupabaseUrl() {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) return process.env.NEXT_PUBLIC_SUPABASE_URL;

  const databaseUrl = process.env.DATABASE_URL;
  const match = databaseUrl?.match(/postgres\.([a-z0-9]+):/i);
  if (match?.[1]) return `https://${match[1]}.supabase.co`;

  throw new Error("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not set.");
}

function getServiceRoleKey() {
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  if (key.startsWith("sb_publishable_")) {
    throw new Error(
      "Supabase publishable key provided for server storage access. Use SUPABASE_SECRET_KEY or legacy SUPABASE_SERVICE_ROLE_KEY instead."
    );
  }
  return key;
}

export function getStorageBucketName() {
  return process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
}

export function getSupabaseStorageClient() {
  return createClient(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export async function ensureStorageBucket() {
  const supabase = getSupabaseStorageClient();
  const bucket = getStorageBucketName();
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

    return { supabase, bucket };
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    allowedMimeTypes: ["image/*"],
  });

  if (createError && createError.message !== "The resource already exists") {
    throw new Error(createError.message);
  }

  return { supabase, bucket };
}

export function getPublicStorageUrl(path: string) {
  const supabase = getSupabaseStorageClient();
  const { data } = supabase.storage.from(getStorageBucketName()).getPublicUrl(path);
  return data.publicUrl;
}

export function getStoragePathFromPublicUrl(url: string) {
  const bucket = getStorageBucketName();
  const marker = `/storage/v1/object/public/${bucket}/`;
  const markerIndex = url.indexOf(marker);
  if (markerIndex === -1) return null;
  return decodeURIComponent(url.slice(markerIndex + marker.length));
}
