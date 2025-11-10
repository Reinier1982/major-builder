import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import db from "../../../db";
import { obstacles } from "../../../db/schema";
import { desc, eq } from "drizzle-orm";

export async function GET(_req: NextRequest) {
  try {
    const rows = await db.select().from(obstacles).orderBy(obstacles.order, obstacles.id);
    return NextResponse.json(rows);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch obstacles" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const body = await req.json();
    const now = new Date();
    const data = {
      name: String(body.name ?? "").trim(),
      description: body.description ? String(body.description) : null,
      status: (body.status ?? "planned") as string,
      order: typeof body.order === "number" ? body.order : null,
      createdAt: now,
      updatedAt: now,
    } as any;

    if (!data.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const inserted = await db.insert(obstacles).values(data).returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to create obstacle" }, { status: 500 });
  }
}
