import { NextRequest, NextResponse } from "next/server";
import { DELETE as deleteImage } from "../../../../event-items/[id]/images/[imageId]/route";
import { getEventItem, obstacleTypeSlug } from "../../../../../../lib/event-items";

type Context = { params: Promise<{ id: string; imageId: string }> };

export async function DELETE(req: NextRequest, ctx: Context) {
  const id = Number((await ctx.params).id);
  const item = Number.isInteger(id) ? await getEventItem(id, obstacleTypeSlug) : null;
  return item ? deleteImage(req, ctx) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
