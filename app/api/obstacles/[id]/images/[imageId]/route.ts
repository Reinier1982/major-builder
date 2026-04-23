import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import db from "../../../../../../db";
import { obstacleImages } from "../../../../../../db/schema";
import { and, eq } from "drizzle-orm";
import {
  getStorageBucketName,
  getStoragePathFromPublicUrl,
  getSupabaseStorageClient,
} from "../../../../../../lib/supabase-storage";

type SessionUser = {
  id?: string;
  role?: string;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; imageId: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const role = user?.role;
  const userId = user?.id;
  if (!session || (role !== "admin" && role !== "builder")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, imageId } = await ctx.params;
  const obstacleId = Number(id);
  const imgId = Number(imageId);
  if (!Number.isFinite(obstacleId) || !Number.isFinite(imgId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const existing = await db
      .select()
      .from(obstacleImages)
      .where(and(eq(obstacleImages.id, imgId), eq(obstacleImages.obstacleId, obstacleId)))
      .limit(1);
    if (!existing[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (role !== "admin" && existing[0].uploadedBy !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deleted = await db
      .delete(obstacleImages)
      .where(and(eq(obstacleImages.id, imgId), eq(obstacleImages.obstacleId, obstacleId)))
      .returning();
    if (!deleted[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const url = deleted[0].url as string;
    const storagePath = getStoragePathFromPublicUrl(url);
    if (storagePath) {
      const { error } = await getSupabaseStorageClient().storage.from(getStorageBucketName()).remove([storagePath]);
      if (error) console.warn("Failed to delete Supabase Storage object:", error.message);
    }
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: errorMessage(err, "Failed to delete") }, { status: 500 });
  }
}
