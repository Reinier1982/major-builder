import { NextRequest, NextResponse } from "next/server";
import { DELETE as deleteEventItem, GET as getEventItemRoute, PUT as updateEventItem } from "../../event-items/[id]/route";
import { getEventItem, obstacleTypeSlug } from "../../../../lib/event-items";

type Context = { params: Promise<{ id: string }> };

async function isObstacle(ctx: Context) {
  const id = Number((await ctx.params).id);
  return Number.isInteger(id) && Boolean(await getEventItem(id, obstacleTypeSlug));
}

export async function GET(req: NextRequest, ctx: Context) {
  return (await isObstacle(ctx)) ? getEventItemRoute(req, ctx) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: NextRequest, ctx: Context) {
  return (await isObstacle(ctx)) ? updateEventItem(req, ctx) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(req: NextRequest, ctx: Context) {
  return (await isObstacle(ctx)) ? deleteEventItem(req, ctx) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
