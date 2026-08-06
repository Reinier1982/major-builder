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
    <section className="flex flex-col gap-5 sm:gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-6 text-white shadow-xl shadow-zinc-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10 bg-white/5" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">Terrein</div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Plattegrond</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">Bekijk in één oogopslag waar alle eventonderdelen worden opgebouwd.</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="text-2xl font-semibold">{located.length}</div>
              <div className="text-xs text-zinc-300">op de kaart</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="text-2xl font-semibold">{missing.length}</div>
              <div className="text-xs text-zinc-300">zonder locatie</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-200/80 bg-white/90 p-3 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-4">
        <TerrainMap eventItems={located} summaryLinks className="rounded-2xl border-0 shadow-none" />
      </div>

      <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Status</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(statusLabelByValue).map(([value, label]) => (
                <span key={value} className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-medium dark:border-zinc-800 dark:bg-zinc-900">
                  <span className={`h-2.5 w-2.5 rounded-full ${statusDotClassByValue[value] ?? statusDotClassByValue.planned}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Types</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {types.map((type) => (
                <span key={type.id} className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 font-medium dark:border-zinc-800 dark:bg-zinc-900">
                  <span className="font-semibold">{eventItemIcon(type.icon)}</span>
                  {type.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/90 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 className="font-semibold tracking-tight">Zonder locatie</h2>
            <p className="text-xs text-zinc-500">Deze items moeten nog op de kaart worden geplaatst.</p>
          </div>
          <span className="grid h-9 min-w-9 place-items-center rounded-full bg-zinc-100 px-2 text-sm font-semibold dark:bg-zinc-900">{missing.length}</span>
        </div>
        <ul className="grid gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3">
          {missing.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-xl border border-zinc-200 px-3 py-3 text-sm transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900">
              <span className={`h-2.5 w-2.5 rounded-full ${statusDotClassByValue[item.status] ?? statusDotClassByValue.planned}`} />
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-zinc-100 font-semibold dark:bg-zinc-800" title={item.type.name}>{eventItemIcon(item.type.icon)}</span>
              <Link href={`/#event-item-${item.id}`} className="font-medium underline-offset-2 hover:underline">
                {item.name}
              </Link>
            </li>
          ))}
          {missing.length === 0 && (
            <li className="p-4 text-sm text-zinc-500 sm:col-span-2 lg:col-span-3">Alle Obstacles hebben een locatie.</li>
          )}
        </ul>
      </div>
    </section>
  );
}
