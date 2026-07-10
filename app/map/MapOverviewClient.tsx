"use client";

import Link from "next/link";
import TerrainMap from "../event-items/TerrainMap";
import { eventItemIcon, hasEventItemLocation, statusDotClassByValue, statusLabelByValue, type EventItem } from "../event-items/eventItemTypes";

type MapOverviewClientProps = {
  eventItems: EventItem[];
};

export default function MapOverviewClient({ eventItems }: MapOverviewClientProps) {
  const located = eventItems.filter(hasEventItemLocation);
  const missing = eventItems.filter((item) => !hasEventItemLocation(item));
  const types = Array.from(new Map(eventItems.map((item) => [item.type.id, item.type])).values());

  return (
    <section className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold">Terreinplattegrond</h2>
        <p className="text-sm text-zinc-500">
          {located.length} van {eventItems.length} Obstacles hebben een locatie.
        </p>
      </div>

      <TerrainMap eventItems={located} summaryLinks />

      <div className="flex flex-wrap gap-2 text-xs">
        {Object.entries(statusLabelByValue).map(([value, label]) => (
          <span key={value} className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-1 dark:border-zinc-700">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDotClassByValue[value] ?? statusDotClassByValue.planned}`} />
            {label}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {types.map((type) => (
          <span key={type.id} className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-1 dark:border-zinc-700">
            <span className="font-semibold">{eventItemIcon(type.icon)}</span>
            {type.name}
          </span>
        ))}
      </div>

      <div className="rounded border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
          <h3 className="font-medium">Zonder locatie</h3>
          <span className="text-sm text-zinc-500">{missing.length}</span>
        </div>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {missing.map((item) => (
            <li key={item.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDotClassByValue[item.status] ?? statusDotClassByValue.planned}`} />
              <span title={item.type.name}>{eventItemIcon(item.type.icon)}</span>
              <Link href={`/#event-item-${item.id}`} className="underline-offset-2 hover:underline">
                {item.name}
              </Link>
            </li>
          ))}
          {missing.length === 0 && (
            <li className="px-3 py-2 text-sm text-zinc-500">Alle Obstacles hebben een locatie.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
