import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { inArray, type InferInsertModel } from "drizzle-orm";
import db from "../../../db";
import { eventItemBuilders, eventItems, users } from "../../../db/schema";
import { authOptions } from "../../../lib/auth";
import {
  allowedStatuses,
  errorMessage,
  getEventItem,
  getEventItemType,
  listEventItems,
  parseLatitude,
  parseLongitude,
  parseMapCoordinate,
} from "../../../lib/event-items";

type SessionUser = { id?: string; role?: string };
type EventItemInsert = InferInsertModel<typeof eventItems>;
type CreateBody = Partial<Record<"typeId" | "builderIds" | "name" | "description" | "comments" | "problemDescription" | "status" | "order" | "locationX" | "locationY" | "locationLat" | "locationLng", unknown>>;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const viewer = session.user as SessionUser | undefined;
    const type = req.nextUrl.searchParams.get("type")?.trim() || undefined;
    return NextResponse.json(await listEventItems(type, viewer ?? {}));
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to fetch event items") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser | undefined)?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const body = (await req.json()) as CreateBody;
    const typeId = typeof body.typeId === "number" ? body.typeId : Number.NaN;
    if (!Number.isInteger(typeId) || !(await getEventItemType(typeId))) {
      return NextResponse.json({ error: "Valid type is required" }, { status: 400 });
    }
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const status = String(body.status ?? "planned");
    if (!allowedStatuses.has(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    if (body.builderIds !== undefined && !Array.isArray(body.builderIds)) {
      return NextResponse.json({ error: "Builder ids must be an array" }, { status: 400 });
    }
    const builderIds = [...new Set((body.builderIds ?? []).map((id) => String(id).trim()).filter(Boolean))];
    if (builderIds.length > 0) {
      const builders = await db.select({ id: users.id }).from(users).where(inArray(users.id, builderIds));
      if (builders.length !== builderIds.length) return NextResponse.json({ error: "Invalid builder" }, { status: 400 });
    }

    const locationX = parseMapCoordinate(body.locationX, 10000);
    const locationY = parseMapCoordinate(body.locationY, 10000);
    if (locationX === undefined || locationY === undefined || (locationX === null) !== (locationY === null)) {
      return NextResponse.json({ error: "Invalid location" }, { status: 400 });
    }
    const locationLat = parseLatitude(body.locationLat);
    const locationLng = parseLongitude(body.locationLng);
    if (locationLat === undefined || locationLng === undefined || (locationLat === null) !== (locationLng === null)) {
      return NextResponse.json({ error: "Invalid map location" }, { status: 400 });
    }
    const now = new Date();
    const data: EventItemInsert = {
      typeId,
      name,
      description: body.description ? String(body.description) : null,
      comments: body.comments ? String(body.comments) : null,
      problemDescription: body.problemDescription ? String(body.problemDescription) : null,
      status,
      order: typeof body.order === "number" ? body.order : null,
      locationX,
      locationY,
      locationLat,
      locationLng,
      createdAt: now,
      updatedAt: now,
    };
    const inserted = await db.transaction(async (tx) => {
      const [item] = await tx.insert(eventItems).values(data).returning({ id: eventItems.id });
      if (builderIds.length > 0) {
        await tx.insert(eventItemBuilders).values(builderIds.map((userId) => ({ eventItemId: item.id, userId })));
      }
      return item;
    });
    return NextResponse.json(await getEventItem(inserted.id), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to create event item") }, { status: 500 });
  }
}
