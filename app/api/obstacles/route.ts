import { NextRequest, NextResponse } from "next/server";
import { GET as getEventItems, POST as createEventItem } from "../event-items/route";
import { getEventItemTypeBySlug, obstacleTypeSlug } from "../../../lib/event-items";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  url.searchParams.set("type", obstacleTypeSlug);
  return getEventItems(new NextRequest(url, req));
}

export async function POST(req: NextRequest) {
  const type = await getEventItemTypeBySlug(obstacleTypeSlug);
  if (!type) return NextResponse.json({ error: "Obstacle type is not configured" }, { status: 500 });
  const body = await req.json();
  return createEventItem(new NextRequest(req.url, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: req.headers.get("cookie") ?? "" },
    body: JSON.stringify({ ...body, typeId: type.id }),
  }));
}
