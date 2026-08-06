import { and, asc, eq } from "drizzle-orm";
import db from "../db";
import { eventItems, eventItemTypes, users } from "../db/schema";

export type EventItemViewer = { id?: string | null; role?: string | null };

export const obstacleTypeSlug = "obstacle";
export const allowedStatuses = new Set(["planned", "in_progress", "problem", "done"]);

const eventItemSelection = {
  id: eventItems.id,
  typeId: eventItems.typeId,
  assignedToId: eventItems.assignedToId,
  assignedToName: users.name,
  assignedToEmail: users.email,
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

function shapeEventItem(row: Awaited<ReturnType<typeof selectEventItems>>[number]) {
  const {
    assignedToName,
    assignedToEmail,
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
    assignedTo: item.assignedToId ? {
      id: item.assignedToId,
      name: assignedToName,
      email: assignedToEmail ?? "",
    } : null,
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
    .innerJoin(eventItemTypes, eq(eventItems.typeId, eventItemTypes.id))
    .leftJoin(users, eq(eventItems.assignedToId, users.id));
}

export async function listEventItems(typeSlug: string | undefined, viewer: EventItemViewer) {
  const query = selectEventItems();
  const conditions = [];
  if (typeSlug) conditions.push(eq(eventItemTypes.slug, typeSlug));
  if (viewer.role !== "admin") {
    if (!viewer.id) return [];
    conditions.push(eq(eventItems.assignedToId, viewer.id));
  }
  const rows = conditions.length
    ? await query.where(and(...conditions)).orderBy(asc(eventItems.order), asc(eventItems.id))
    : await query.orderBy(asc(eventItems.order), asc(eventItems.id));
  return rows.map(shapeEventItem);
}

export async function getEventItem(id: number, typeSlug?: string) {
  const conditions = [eq(eventItems.id, id)];
  if (typeSlug) conditions.push(eq(eventItemTypes.slug, typeSlug));
  const rows = await selectEventItems().where(and(...conditions)).limit(1);
  return rows[0] ? shapeEventItem(rows[0]) : null;
}

export async function canAccessEventItem(id: number, viewer: EventItemViewer) {
  if (viewer.role === "admin") return Boolean(await getEventItem(id));
  if (!viewer.id) return false;
  const rows = await db.select({ id: eventItems.id }).from(eventItems).where(and(
    eq(eventItems.id, id),
    eq(eventItems.assignedToId, viewer.id),
  )).limit(1);
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
