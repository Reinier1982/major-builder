import { and, asc, eq, inArray } from "drizzle-orm";
import db from "../db";
import { eventItemBuilders, eventItems, eventItemTypes, users } from "../db/schema";

export type EventItemViewer = { id?: string | null; role?: string | null };

export const obstacleTypeSlug = "obstacle";
export const allowedStatuses = new Set(["planned", "in_progress", "problem", "done"]);

const eventItemSelection = {
  id: eventItems.id,
  typeId: eventItems.typeId,
  name: eventItems.name,
  description: eventItems.description,
  comments: eventItems.comments,
  problemDescription: eventItems.problemDescription,
  status: eventItems.status,
  order: eventItems.order,
  locationX: eventItems.locationX,
  locationY: eventItems.locationY,
  locationLat: eventItems.locationLat,
  locationLng: eventItems.locationLng,
  createdAt: eventItems.createdAt,
  updatedAt: eventItems.updatedAt,
  typeSlug: eventItemTypes.slug,
  typeName: eventItemTypes.name,
  typeDescription: eventItemTypes.description,
  typeIcon: eventItemTypes.icon,
  typeActive: eventItemTypes.active,
  typeCreatedAt: eventItemTypes.createdAt,
  typeUpdatedAt: eventItemTypes.updatedAt,
};

type EventItemRow = Awaited<ReturnType<typeof selectEventItems>>[number];

function shapeEventItem(row: EventItemRow, builders: Array<{ id: string; name: string | null; email: string }>) {
  const {
    typeSlug,
    typeName,
    typeDescription,
    typeIcon,
    typeActive,
    typeCreatedAt,
    typeUpdatedAt,
    ...item
  } = row;
  return {
    ...item,
    builderIds: builders.map((builder) => builder.id),
    builders,
    type: {
      id: row.typeId,
      slug: typeSlug,
      name: typeName,
      description: typeDescription,
      icon: typeIcon,
      active: typeActive,
      createdAt: typeCreatedAt,
      updatedAt: typeUpdatedAt,
    },
  };
}

function selectEventItems() {
  return db
    .select(eventItemSelection)
    .from(eventItems)
    .innerJoin(eventItemTypes, eq(eventItems.typeId, eventItemTypes.id));
}

async function shapeEventItems(rows: EventItemRow[]) {
  if (rows.length === 0) return [];
  const assignments = await db
    .select({
      eventItemId: eventItemBuilders.eventItemId,
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(eventItemBuilders)
    .innerJoin(users, eq(eventItemBuilders.userId, users.id))
    .where(inArray(eventItemBuilders.eventItemId, rows.map((row) => row.id)))
    .orderBy(asc(users.name), asc(users.email));
  const buildersByItem = new Map<number, Array<{ id: string; name: string | null; email: string }>>();
  for (const assignment of assignments) {
    const builders = buildersByItem.get(assignment.eventItemId) ?? [];
    builders.push({ id: assignment.id, name: assignment.name, email: assignment.email });
    buildersByItem.set(assignment.eventItemId, builders);
  }
  return rows.map((row) => shapeEventItem(row, buildersByItem.get(row.id) ?? []));
}

export async function listEventItems(typeSlug: string | undefined, viewer: EventItemViewer) {
  if (viewer.role !== "admin" && !viewer.id) return [];

  const conditions = [];
  if (typeSlug) conditions.push(eq(eventItemTypes.slug, typeSlug));
  if (viewer.role !== "admin") conditions.push(eq(eventItemBuilders.userId, viewer.id!));

  const query = viewer.role === "admin"
    ? selectEventItems()
    : db.select(eventItemSelection).from(eventItems)
      .innerJoin(eventItemTypes, eq(eventItems.typeId, eventItemTypes.id))
      .innerJoin(eventItemBuilders, eq(eventItems.id, eventItemBuilders.eventItemId));
  const rows = conditions.length
    ? await query.where(and(...conditions)).orderBy(asc(eventItems.order), asc(eventItems.id))
    : await query.orderBy(asc(eventItems.order), asc(eventItems.id));
  return shapeEventItems(rows);
}

export async function getEventItem(id: number, typeSlug?: string) {
  const conditions = [eq(eventItems.id, id)];
  if (typeSlug) conditions.push(eq(eventItemTypes.slug, typeSlug));
  const rows = await selectEventItems().where(and(...conditions)).limit(1);
  const shaped = await shapeEventItems(rows);
  return shaped[0] ?? null;
}

export async function canAccessEventItem(id: number, viewer: EventItemViewer) {
  if (viewer.role === "admin") return Boolean(await getEventItem(id));
  if (!viewer.id) return false;
  const rows = await db.select({ id: eventItems.id })
    .from(eventItems)
    .innerJoin(eventItemBuilders, eq(eventItems.id, eventItemBuilders.eventItemId))
    .where(and(eq(eventItems.id, id), eq(eventItemBuilders.userId, viewer.id)))
    .limit(1);
  return rows.length > 0;
}

export async function getEventItemType(id: number) {
  const rows = await db.select().from(eventItemTypes).where(eq(eventItemTypes.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function getEventItemTypeBySlug(slug: string) {
  const rows = await db.select().from(eventItemTypes).where(eq(eventItemTypes.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export function parseMapCoordinate(value: unknown, max: number) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded < 0 || rounded > max ? undefined : rounded;
}

export function parseLatitude(value: unknown) {
  if (value === undefined || value === null) return null;
  return typeof value === "number" && Number.isFinite(value) && value >= -90 && value <= 90 ? value : undefined;
}

export function parseLongitude(value: unknown) {
  if (value === undefined || value === null) return null;
  return typeof value === "number" && Number.isFinite(value) && value >= -180 && value <= 180 ? value : undefined;
}

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
