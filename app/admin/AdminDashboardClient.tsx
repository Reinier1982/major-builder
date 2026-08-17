"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { statuses } from "../event-items/eventItemTypes";

type EventItem = {
  id: number;
  status: string;
  builderIds: string[];
  locationLat: number | null;
  locationLng: number | null;
};

const statusCardStyles: Record<string, string> = {
  planned: "border-slate-200 bg-slate-50/80 text-slate-900 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-100",
  in_progress: "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
  problem: "border-rose-200 bg-rose-50/80 text-rose-950 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
  done: "border-emerald-200 bg-emerald-50/80 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100",
};

const statusDotStyles: Record<string, string> = {
  planned: "bg-slate-500",
  in_progress: "bg-amber-500",
  problem: "bg-rose-500",
  done: "bg-emerald-500",
};

const statusBarStyles: Record<string, string> = {
  planned: "bg-slate-500",
  in_progress: "bg-amber-500",
  problem: "bg-rose-500",
  done: "bg-emerald-500",
};

export default function AdminDashboardClient() {
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/event-items", { cache: "no-store" });
        if (!res.ok) throw new Error(`Laden mislukt (${res.status})`);
        const data = (await res.json()) as EventItem[];
        setItems(data);
      } catch (e) {
        const message = e instanceof Error ? e.message : "Dashboard laden mislukt";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    fetchItems();
  }, []);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(statuses.map((status) => [status.value, 0])) as Record<string, number>;
    for (const item of items) {
      if (item.status in counts) {
        counts[item.status] += 1;
      }
    }
    return counts;
  }, [items]);

  const doneCount = statusCounts.done ?? 0;
  const problemCount = statusCounts.problem ?? 0;
  const completionPercentage = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;
  const assignedCount = items.filter((item) => item.builderIds.length > 0).length;
  const locatedCount = items.filter((item) => typeof item.locationLat === "number" && typeof item.locationLng === "number").length;

  if (loading) {
    return (
      <div className="grid animate-pulse gap-4">
        <div className="h-56 rounded-3xl bg-zinc-200 dark:bg-zinc-800" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-36 rounded-2xl bg-zinc-200 dark:bg-zinc-800" />)}
        </div>
      </div>
    );
  }
  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>;
  }

  return (
    <section className="flex flex-col gap-5 sm:gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-6 text-white shadow-xl shadow-zinc-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10 bg-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-20 h-56 w-56 rounded-full border border-white/10" />
        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-zinc-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Live overzicht
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Admin dashboard</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-300 sm:text-base">
              Houd de voortgang, bezetting en aandachtspunten van de volledige eventopbouw in de gaten.
            </p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <div className="relative grid h-20 w-20 place-items-center rounded-full" style={{ background: `conic-gradient(#34d399 ${completionPercentage * 3.6}deg, rgba(255,255,255,.12) 0deg)` }}>
              <div className="grid h-16 w-16 place-items-center rounded-full bg-zinc-900 text-lg font-semibold">{completionPercentage}%</div>
            </div>
            <div>
              <div className="text-3xl font-semibold tracking-tight">{doneCount}<span className="text-lg text-zinc-400">/{items.length}</span></div>
              <div className="text-sm text-zinc-300">items afgerond</div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Statusoverzicht</h2>
            <p className="text-sm text-zinc-500">Klik op een status om de bijbehorende items te bekijken.</p>
          </div>
          <span className="hidden text-sm text-zinc-500 sm:block">{items.length} items totaal</span>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statuses.map((status) => {
          const count = statusCounts[status.value] ?? 0;
          const percentage = items.length > 0 ? Math.round((count / items.length) * 100) : 0;

          return (
            <Link
              key={status.value}
              href={`/?status=${status.value}`}
              className={`group rounded-2xl border p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-zinc-400 sm:p-5 ${statusCardStyles[status.value] ?? "border-zinc-200 bg-zinc-50 text-zinc-900"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-75">
                  <span className={`h-2 w-2 rounded-full ${statusDotStyles[status.value]}`} />
                  {status.label}
                </div>
                <span className="transition-transform group-hover:translate-x-0.5" aria-hidden="true">→</span>
              </div>
              <div className="mt-5 text-4xl font-semibold leading-none tracking-tight">{count}</div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div className={`h-full rounded-full ${statusBarStyles[status.value]}`} style={{ width: `${percentage}%` }} />
              </div>
              <div className="mt-2 text-xs font-medium opacity-65">{percentage}% van totaal</div>
            </Link>
          );
        })}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-3xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-6">
          <div className="mb-5">
            <h2 className="text-lg font-semibold tracking-tight">Operationeel overzicht</h2>
            <p className="text-sm text-zinc-500">Belangrijke gegevens voor een soepele opbouw.</p>
          </div>
          <div className="grid divide-y divide-zinc-200 dark:divide-zinc-800 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="py-4 sm:px-4 sm:py-2 sm:first:pl-0">
              <div className="text-3xl font-semibold tracking-tight">{assignedCount}<span className="text-base font-normal text-zinc-400">/{items.length}</span></div>
              <div className="mt-1 text-sm font-medium">Toegewezen</div>
              <div className="mt-1 text-xs text-zinc-500">Items met een of meer bouwers</div>
            </div>
            <div className="py-4 sm:px-4 sm:py-2">
              <div className="text-3xl font-semibold tracking-tight">{locatedCount}<span className="text-base font-normal text-zinc-400">/{items.length}</span></div>
              <div className="mt-1 text-sm font-medium">Op de kaart</div>
              <div className="mt-1 text-xs text-zinc-500">Items met een locatie</div>
            </div>
            <div className="py-4 sm:px-4 sm:py-2 sm:last:pr-0">
              <div className={`text-3xl font-semibold tracking-tight ${problemCount > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>{problemCount}</div>
              <div className="mt-1 text-sm font-medium">Aandacht nodig</div>
              <div className="mt-1 text-xs text-zinc-500">Open problemen</div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Snel naar</h2>
            <p className="text-sm text-zinc-500">Veelgebruikte beheerfuncties.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { href: "/", label: "Alle items", detail: "Beheren en toewijzen" },
              { href: "/map", label: "Plattegrond", detail: "Locaties controleren" },
              { href: "/users", label: "Gebruikers", detail: "Rollen en toegang" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="group flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5 transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-600 dark:hover:bg-zinc-900">
                <span>
                  <span className="block text-sm font-medium">{link.label}</span>
                  <span className="block text-xs text-zinc-500">{link.detail}</span>
                </span>
                <span className="text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-zinc-700 dark:group-hover:text-zinc-200" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
