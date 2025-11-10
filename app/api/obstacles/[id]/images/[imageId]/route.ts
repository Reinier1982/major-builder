import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../../lib/auth";
import path from "path";
import { unlink } from "fs/promises";
import db from "../../../../../../db";
import { obstacleImages } from "../../../../../../db/schema";
import { and, eq } from "drizzle-orm";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; imageId: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id, imageId } = await ctx.params;
  const obstacleId = Number(id);
  const imgId = Number(imageId);
  if (!Number.isFinite(obstacleId) || !Number.isFinite(imgId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const deleted = await db
      .delete(obstacleImages)
      .where(and(eq(obstacleImages.id, imgId), eq(obstacleImages.obstacleId, obstacleId)))
      .returning();
    if (!deleted[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const url = deleted[0].url as string;
    if (url?.startsWith("/uploads/")) {
      const p = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
      try { await unlink(p); } catch {}
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to delete" }, { status: 500 });
  }
}
