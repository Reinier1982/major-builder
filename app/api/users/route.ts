import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import db from "../../../db";
import { users } from "../../../db/schema";
import { asc, sql } from "drizzle-orm";

type SessionUser = { role?: string };

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  const role = (session?.user as SessionUser | undefined)?.role;
  if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(users).orderBy(asc(users.name), asc(users.email));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as SessionUser | undefined)?.role;
  if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const userRole = String(body.role ?? "builder");

    if (!name) return NextResponse.json({ error: "Naam is verplicht." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Vul een geldig e-mailadres in." }, { status: 400 });
    }
    if (userRole !== "admin" && userRole !== "builder") {
      return NextResponse.json({ error: "Ongeldige rol." }, { status: 400 });
    }

    const [existing] = await db.select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);
    if (existing) return NextResponse.json({ error: "Er bestaat al een gebruiker met dit e-mailadres." }, { status: 409 });

    const [created] = await db.insert(users).values({ name, email, role: userRole }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gebruiker toevoegen mislukt";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
