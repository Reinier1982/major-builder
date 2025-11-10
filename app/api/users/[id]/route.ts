import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import db from "../../../../db";
import { users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const userId = id;
  const body = await req.json();
  const patch: any = {};
  if (body.name !== undefined) patch.name = body.name === null ? null : String(body.name);
  if (body.role !== undefined) patch.role = String(body.role);
  const updated = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
  if (!updated[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated[0]);
}

