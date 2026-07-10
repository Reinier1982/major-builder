import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import path from "path";
import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import db from "../../../../../db";
import { eventItemImages } from "../../../../../db/schema";
import { authOptions } from "../../../../../lib/auth";
import { errorMessage, getEventItem } from "../../../../../lib/event-items";
import { ensureStorageBucket } from "../../../../../lib/supabase-storage";

type SessionUser = { id?: string; role?: string };

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const eventItemId = Number((await ctx.params).id);
  if (!Number.isInteger(eventItemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    return NextResponse.json(await db.select().from(eventItemImages).where(eq(eventItemImages.eventItemId, eventItemId)));
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to fetch images") }, { status: 500 });
  }
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const eventItemId = Number((await ctx.params).id);
  if (!Number.isInteger(eventItemId)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as SessionUser | undefined;
    if (!session || (user?.role !== "admin" && user?.role !== "builder")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const item = await getEventItem(eventItemId);
    if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const form = await req.formData();
    const files = form.getAll("image");
    if (!files.length) return NextResponse.json({ error: "No files provided (field 'image')" }, { status: 400 });
    const { supabase, bucket } = await ensureStorageBucket();
    const inserted: Array<typeof eventItemImages.$inferSelect> = [];
    for (const file of files) {
      if (!(file instanceof File) || !file.type.startsWith("image/")) continue;
      const extension = (path.extname(file.name || "") || ".bin").slice(0, 10);
      const storagePath = `event-items/${eventItemId}/${Date.now()}-${randomUUID()}${extension}`;
      const { error } = await supabase.storage.from(bucket).upload(storagePath, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
      const [row] = await db.insert(eventItemImages).values({
        eventItemId,
        url: data.publicUrl,
        label: (form.get("label") as string) || null,
        uploadedBy: user.id ?? null,
        createdAt: new Date(),
      }).returning();
      inserted.push(row);
    }
    return NextResponse.json(inserted, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Upload failed") }, { status: 500 });
  }
}
