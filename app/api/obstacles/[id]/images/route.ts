import { NextRequest, NextResponse } from "next/server";
import { GET as getImages, POST as addImages } from "../../../event-items/[id]/images/route";
import { getEventItem, obstacleTypeSlug } from "../../../../../lib/event-items";

type Context = { params: Promise<{ id: string }> };

async function isObstacle(ctx: Context) {
  const id = Number((await ctx.params).id);
  return Number.isInteger(id) && Boolean(await getEventItem(id, obstacleTypeSlug));
}

export async function GET(req: NextRequest, ctx: Context) {
  return (await isObstacle(ctx)) ? getImages(req, ctx) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function POST(req: NextRequest, ctx: Context) {
  return (await isObstacle(ctx)) ? addImages(req, ctx) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
