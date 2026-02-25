import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import db from "../../../../db";
import { obstacles } from "../../../../db/schema";
import { eq } from "drizzle-orm";

function ensureProblemDescriptionColumn() {
  const sqlite = (db as any).$client;
  const cols = sqlite.prepare("PRAGMA table_info('obstacles')").all() as Array<{ name: string }>;
  const hasColumn = cols.some((c) => c.name === "problem_description");
  if (!hasColumn) {
    sqlite.prepare("ALTER TABLE obstacles ADD COLUMN problem_description text").run();
  }
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    ensureProblemDescriptionColumn();
    const rows = await db.select().from(obstacles).where(eq(obstacles.id, id)).limit(1);
    if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to fetch obstacle" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    ensureProblemDescriptionColumn();
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    const body = await req.json();
    const patch: any = {};
    if (body.name !== undefined) patch.name = String(body.name);
    if (body.description !== undefined) patch.description = body.description === null ? null : String(body.description);
    if (body.problemDescription !== undefined) patch.problemDescription = body.problemDescription === null ? null : String(body.problemDescription);
    if (body.status !== undefined) patch.status = String(body.status);
    if (body.order !== undefined) patch.order = typeof body.order === "number" ? body.order : null;
    patch.updatedAt = new Date();
    // Enforce permissions: builders may only change status + problemDescription
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (role !== "admin") {
      // If builder attempts to modify fields other than status/problemDescription, reject
      const keys = Object.keys(patch).filter((k) => k !== "status" && k !== "problemDescription" && k !== "updatedAt");
      if (keys.length > 0) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const updated = await db.update(obstacles).set(patch).where(eq(obstacles.id, id)).returning();
    if (!updated[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to update obstacle" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id: idParam } = await ctx.params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const deleted = await db.delete(obstacles).where(eq(obstacles.id, id)).returning();
    if (!deleted[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Failed to delete obstacle" }, { status: 500 });
  }
}
