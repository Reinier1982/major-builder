import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../lib/auth";
import db from "../../../../db";
import { accounts, sessions, users } from "../../../../db/schema";
import { eq } from "drizzle-orm";

type SessionUser = {
  role?: string;
};

type UserPatch = {
  name?: string | null;
  role?: string;
};

async function getUserById(userId: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0];
}

async function countAdmins() {
  const admins = await db.select({ id: users.id }).from(users).where(eq(users.role, "admin"));
  return admins.length;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as SessionUser | undefined)?.role;
  if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const userId = id;
    const existing = await getUserById(userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = (await req.json()) as Record<string, unknown>;
    const patch: UserPatch = {};
    if (body.name !== undefined) patch.name = body.name === null ? null : String(body.name);
    if (body.role !== undefined) patch.role = String(body.role);

    if (existing.role === "admin" && patch.role !== undefined && patch.role !== "admin") {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Er moet altijd minimaal één Beheerder overblijven." },
          { status: 400 }
        );
      }
    }

    const updated = await db.update(users).set(patch).where(eq(users.id, userId)).returning();
    if (!updated[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated[0]);
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error, "Bijwerken mislukt") }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as SessionUser | undefined)?.role;
  if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { id } = await params;
    const userId = id;
    const existing = await getUserById(userId);
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.role === "admin") {
      const adminCount = await countAdmins();
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Er moet altijd minimaal één Beheerder overblijven." },
          { status: 400 }
        );
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(sessions).where(eq(sessions.userId, userId));
      await tx.delete(accounts).where(eq(accounts.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "23503") {
      return NextResponse.json({ error: "Deze gebruiker kan nog niet worden verwijderd." }, { status: 409 });
    }

    return NextResponse.json({ error: getErrorMessage(error, "Verwijderen mislukt") }, { status: 500 });
  }
}
