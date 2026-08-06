import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, eq } from "drizzle-orm";
import db from "../../../../../../db";
import { eventItemImages } from "../../../../../../db/schema";
import { authOptions } from "../../../../../../lib/auth";
import { canAccessEventItem, errorMessage } from "../../../../../../lib/event-items";
import { getStorageBucketName, getStoragePathFromPublicUrl, getSupabaseStorageClient } from "../../../../../../lib/supabase-storage";

type SessionUser = { id?: string; role?: string };

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; imageId: string }> }) {
  const { id, imageId } = await ctx.params;
  const eventItemId = Number(id);
  const image = Number(imageId);
  if (!Number.isInteger(eventItemId) || !Number.isInteger(image)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!session || (user?.role !== "admin" && user?.role !== "builder")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!await canAccessEventItem(eventItemId, user ?? {})) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const [existing] = await db.select().from(eventItemImages).where(and(eq(eventItemImages.id, image), eq(eventItemImages.eventItemId, eventItemId))).limit(1);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (user.role !== "admin" && existing.uploadedBy !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await db.delete(eventItemImages).where(and(eq(eventItemImages.id, image), eq(eventItemImages.eventItemId, eventItemId)));
    const storagePath = getStoragePathFromPublicUrl(existing.url);
    if (storagePath) {
      const { error } = await getSupabaseStorageClient().storage.from(getStorageBucketName()).remove([storagePath]);
      if (error) console.warn("Failed to delete Supabase Storage object:", error.message);
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to delete image") }, { status: 500 });
  }
}
