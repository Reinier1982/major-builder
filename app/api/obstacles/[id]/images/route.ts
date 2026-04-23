import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import path from "path";
import { randomUUID } from "crypto";
import db from "../../../../../db";
import { obstacleImages } from "../../../../../db/schema";
import { eq } from "drizzle-orm";
import { ensureStorageBucket } from "../../../../../lib/supabase-storage";

type SessionUser = {
  id?: string;
  role?: string;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const obstacleId = Number(id);
  if (!Number.isFinite(obstacleId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const rows = await db.select().from(obstacleImages).where(eq(obstacleImages.obstacleId, obstacleId));
    return NextResponse.json(rows);
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, "Failed to fetch images") }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const obstacleId = Number(id);
  if (!Number.isFinite(obstacleId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    const role = user?.role;
    const userId = user?.id;
    if (!session || (role !== "admin" && role !== "builder")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const form = await req.formData();
    const files = form.getAll("image");
    if (!files.length) return NextResponse.json({ error: "No files provided (field 'image')" }, { status: 400 });

    const { supabase, bucket } = await ensureStorageBucket();

    const inserted: Array<typeof obstacleImages.$inferSelect> = [];
    for (const f of files) {
      if (!(f instanceof File)) continue;
      const type = f.type || "";
      if (!type.startsWith("image/")) continue;
      const arrayBuffer = await f.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = path.extname(f.name || "") || ".bin";
      const safeExt = ext.slice(0, 10);
      const storagePath = `obstacles/${obstacleId}/${Date.now()}-${randomUUID()}${safeExt}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
        contentType: type,
        upsert: false,
      });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const row = await db
        .insert(obstacleImages)
        .values({
          obstacleId,
          url: data.publicUrl,
          label: (form.get("label") as string) || null,
          uploadedBy: userId ?? null,
          createdAt: new Date(),
        })
        .returning();
      inserted.push(row[0]);
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, "Upload failed") }, { status: 500 });
  }
}
