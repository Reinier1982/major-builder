import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { asc } from "drizzle-orm";
import db from "../../../db";
import { eventItemTypes } from "../../../db/schema";
import { authOptions } from "../../../lib/auth";
import { errorMessage } from "../../../lib/event-items";

type SessionUser = { role?: string };

export async function GET() {
  try {
    return NextResponse.json(await db.select().from(eventItemTypes).orderBy(asc(eventItemTypes.name)));
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to fetch event item types") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as SessionUser | undefined)?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json() as { name?: unknown; slug?: unknown; description?: unknown; icon?: unknown };
    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!name || !slug) return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
    const [created] = await db.insert(eventItemTypes).values({
      name,
      slug,
      description: body.description ? String(body.description) : null,
      icon: String(body.icon ?? "pin").trim() || "pin",
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error, "Failed to create event item type") }, { status: 500 });
  }
}
