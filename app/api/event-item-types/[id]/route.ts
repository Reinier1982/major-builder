import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import db from "../../../../db";
import { eventItemTypes } from "../../../../db/schema";
import { authOptions } from "../../../../lib/auth";
import { errorMessage, obstacleTypeSlug } from "../../../../lib/event-items";

type SessionUser = { role?: string };

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser | undefined)?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json() as { name?: unknown; description?: unknown; icon?: unknown; active?: unknown };
    const patch: Partial<typeof eventItemTypes.$inferInsert> = { updatedAt: new Date() };
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      patch.name = name;
    }
    if (body.description !== undefined) patch.description = body.description === null ? null : String(body.description);
    if (body.icon !== undefined) patch.icon = String(body.icon).trim() || "pin";
    if (body.active !== undefined) patch.active = Boolean(body.active);
    const [updated] = await db.update(eventItemTypes).set(patch).where(eq(eventItemTypes.id, id)).returning();
    return updated ? NextResponse.json(updated) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to update event item type") }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser | undefined)?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const [type] = await db.select().from(eventItemTypes).where(eq(eventItemTypes.id, id)).limit(1);
    if (!type) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (type.slug === obstacleTypeSlug) return NextResponse.json({ error: "The obstacle type cannot be deleted" }, { status: 409 });
    const [deleted] = await db.delete(eventItemTypes).where(eq(eventItemTypes.id, id)).returning();
    return NextResponse.json({ ok: Boolean(deleted) });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Type is still in use and cannot be deleted") }, { status: 409 });
  }
}
