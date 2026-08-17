import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, inArray, type InferInsertModel } from "drizzle-orm";
import db from "../../../../db";
import { eventItemBuilders, eventItems, users } from "../../../../db/schema";
import { authOptions } from "../../../../lib/auth";
import { allowedStatuses, canAccessEventItem, errorMessage, getEventItem, getEventItemType, parseLatitude, parseLongitude, parseMapCoordinate } from "../../../../lib/event-items";

type SessionUser = { id?: string; role?: string };
type Patch = Partial<InferInsertModel<typeof eventItems>>;
type PatchBody = Partial<Record<"typeId" | "builderIds" | "name" | "description" | "comments" | "problemDescription" | "status" | "order" | "locationX" | "locationY" | "locationLat" | "locationLng", unknown>>;

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const viewer = session.user as SessionUser | undefined;
    if (!await canAccessEventItem(id, viewer ?? {})) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const item = await getEventItem(id);
    return item ? NextResponse.json(item) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to fetch event item") }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const viewer = session.user as SessionUser | undefined;
    const role = viewer?.role;
    if (!await canAccessEventItem(id, viewer ?? {})) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const body = (await req.json()) as PatchBody;
    const patch: Patch = {};
    let builderIds: string[] | undefined;
    if (body.typeId !== undefined) {
      if (typeof body.typeId !== "number" || !Number.isInteger(body.typeId) || !(await getEventItemType(body.typeId))) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
      patch.typeId = body.typeId;
    }
    if (body.builderIds !== undefined) {
      if (!Array.isArray(body.builderIds)) return NextResponse.json({ error: "Builder ids must be an array" }, { status: 400 });
      builderIds = [...new Set(body.builderIds.map((builderId) => String(builderId).trim()).filter(Boolean))];
      if (builderIds.length > 0) {
        const builders = await db.select({ id: users.id }).from(users).where(inArray(users.id, builderIds));
        if (builders.length !== builderIds.length) return NextResponse.json({ error: "Invalid builder" }, { status: 400 });
      }
    }
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
      patch.name = name;
    }
    if (body.description !== undefined) patch.description = body.description === null ? null : String(body.description);
    if (body.comments !== undefined) patch.comments = body.comments === null ? null : String(body.comments);
    if (body.problemDescription !== undefined) patch.problemDescription = body.problemDescription === null ? null : String(body.problemDescription);
    if (body.status !== undefined) {
      const status = String(body.status);
      if (!allowedStatuses.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      patch.status = status;
    }
    if (body.order !== undefined) patch.order = typeof body.order === "number" ? body.order : null;
    if (body.locationX !== undefined || body.locationY !== undefined) {
      const x = parseMapCoordinate(body.locationX, 10000);
      const y = parseMapCoordinate(body.locationY, 10000);
      const clearing = body.locationX === null && body.locationY === null;
      if (!clearing && (x === undefined || y === undefined || x === null || y === null)) return NextResponse.json({ error: "Invalid location" }, { status: 400 });
      patch.locationX = clearing ? null : x;
      patch.locationY = clearing ? null : y;
    }
    if (body.locationLat !== undefined || body.locationLng !== undefined) {
      const lat = parseLatitude(body.locationLat);
      const lng = parseLongitude(body.locationLng);
      const clearing = body.locationLat === null && body.locationLng === null;
      if (!clearing && (lat === undefined || lng === undefined || lat === null || lng === null)) return NextResponse.json({ error: "Invalid map location" }, { status: 400 });
      patch.locationLat = clearing ? null : lat;
      patch.locationLng = clearing ? null : lng;
    }
    if (role !== "admin") {
      const builderFields = new Set(["status", "problemDescription"]);
      if (builderIds !== undefined || Object.keys(patch).some((key) => !builderFields.has(key))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    patch.updatedAt = new Date();
    const updated = await db.transaction(async (tx) => {
      const [item] = await tx.update(eventItems).set(patch).where(eq(eventItems.id, id)).returning({ id: eventItems.id });
      if (item && builderIds !== undefined) {
        await tx.delete(eventItemBuilders).where(eq(eventItemBuilders.eventItemId, id));
        if (builderIds.length > 0) {
          await tx.insert(eventItemBuilders).values(builderIds.map((userId) => ({ eventItemId: id, userId })));
        }
      }
      return item;
    });
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(await getEventItem(updated.id));
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to update event item") }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const id = parseId((await ctx.params).id);
  if (!id) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser | undefined)?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const [deleted] = await db.delete(eventItems).where(eq(eventItems.id, id)).returning({ id: eventItems.id });
    return deleted ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "Not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to delete event item") }, { status: 500 });
  }
}
