export const mapCoordinateMax = 10000;

export type EventItemStatus = "planned" | "in_progress" | "problem" | "done";

export type EventItemType = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  active: boolean;
  createdAt?: string | number | Date | null;
  updatedAt?: string | number | Date | null;
};

export type EventItem = {
  id: number;
  typeId: number;
  type: EventItemType;
  builderIds: string[];
  builders: Array<{
    id: string;
    name: string | null;
    email: string;
  }>;
  name: string;
  description: string | null;
  comments: string | null;
  problemDescription: string | null;
  status: string;
  order: number | null;
  locationX: number | null;
  locationY: number | null;
  locationLat: number | null;
  locationLng: number | null;
  createdAt?: string | number | Date | null;
  updatedAt?: string | number | Date | null;
};

export type EventItemLocation = { lat: number; lng: number };

export const statuses = [
  { value: "planned", label: "Gepland" },
  { value: "in_progress", label: "Aan het opbouwen" },
  { value: "problem", label: "Probleem" },
  { value: "done", label: "Klaar" },
] as const;

export const statusLabelByValue = Object.fromEntries(statuses.map((status) => [status.value, status.label])) as Record<string, string>;

export const statusColorByValue: Record<string, string> = {
  planned: "#71717a",
  in_progress: "#f59e0b",
  problem: "#dc2626",
  done: "#059669",
};

export const statusDotClassByValue: Record<string, string> = {
  planned: "bg-zinc-500",
  in_progress: "bg-amber-500",
  problem: "bg-red-600",
  done: "bg-emerald-600",
};

export function hasEventItemLocation(item: Pick<EventItem, "locationLat" | "locationLng">) {
  return typeof item.locationLat === "number" && typeof item.locationLng === "number";
}

export function getEventItemLocation(item: Pick<EventItem, "locationLat" | "locationLng">): EventItemLocation | null {
  if (!hasEventItemLocation(item)) return null;
  return { lat: item.locationLat as number, lng: item.locationLng as number };
}

export function eventItemIcon(icon: string) {
  const icons: Record<string, string> = {
    obstacle: "▲",
    pin: "●",
    stage: "★",
    parking: "P",
    aid: "+",
    food: "◆",
  };
  return icons[icon] ?? icon.slice(0, 2).toUpperCase();
}
