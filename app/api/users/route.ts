import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../lib/auth";
import db from "../../../db";
import { users } from "../../../db/schema";

type SessionUser = { role?: string };

export async function GET(req: NextRequest) {
  void req;
  const session = await getServerSession(authOptions);
  const role = (session?.user as SessionUser | undefined)?.role;
  if (!session || role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const rows = await db.select().from(users);
  return NextResponse.json(rows);
}
