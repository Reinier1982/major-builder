import { and, asc, eq } from "drizzle-orm";
import db from "../db";
import { eventItems, eventItemTypes } from "../db/schema";

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

function shapeEventItem(row: Awaited<ReturnType<typeof selectEventItems>>[number]) {
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
  return db.select(eventItemSelection).from(eventItems).innerJoin(eventItemTypes, eq(eventItems.typeId, eventItemTypes.id));
}

export async function listEventItems(typeSlug?: string) {
  const query = selectEventItems();
  const rows = typeSlug
    ? await query.where(eq(eventItemTypes.slug, typeSlug)).orderBy(asc(eventItems.order), asc(eventItems.id))
    : await query.orderBy(asc(eventItems.order), asc(eventItems.id));
  return rows.map(shapeEventItem);
}

export async function getEventItem(id: number, typeSlug?: string) {
  const conditions = [eq(eventItems.id, id)];
  if (typeSlug) conditions.push(eq(eventItemTypes.slug, typeSlug));
  const rows = await selectEventItems().where(and(...conditions)).limit(1);
  return rows[0] ? shapeEventItem(rows[0]) : null;
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
