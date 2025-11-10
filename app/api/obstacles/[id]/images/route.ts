import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../../lib/auth";
import path from "path";
import { mkdir, writeFile } from "fs/promises";
import db from "../../../../../db";
import { obstacleImages } from "../../../../../db/schema";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const obstacleId = Number(id);
  if (!Number.isFinite(obstacleId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const rows = await db.select().from(obstacleImages).where(eq(obstacleImages.obstacleId, obstacleId));
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch images" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const obstacleId = Number(id);
  if (!Number.isFinite(obstacleId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const form = await req.formData();
    const files = form.getAll("image");
    if (!files.length) return NextResponse.json({ error: "No files provided (field 'image')" }, { status: 400 });

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadsDir, { recursive: true });

    const inserted: any[] = [];
    for (const f of files) {
      if (!(f instanceof File)) continue;
      const type = f.type || "";
      if (!type.startsWith("image/")) continue;
      const arrayBuffer = await f.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const ext = path.extname((f as any).name || "") || ".bin";
      const safeExt = ext.slice(0, 10);
      const filename = `obst_${obstacleId}_${Date.now()}_${Math.random().toString(36).slice(2)}${safeExt}`;
      const filePath = path.join(uploadsDir, filename);
      await writeFile(filePath, buffer);
      const url = `/uploads/${filename}`;
      const row = await db
        .insert(obstacleImages)
        .values({ obstacleId, url, label: (form.get("label") as string) || null, createdAt: new Date() as any })
        .returning();
      inserted.push(row[0]);
    }

    return NextResponse.json(inserted, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}
