"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Obstacle = {
  id: number;
  status: string;
};

const statuses = [
  { value: "planned", label: "Gepland" },
  { value: "in_progress", label: "Aan het opbouwen" },
  { value: "problem", label: "Probleem" },
  { value: "done", label: "Klaar" },
];

const statusCardStyles: Record<string, string> = {
  planned: "border-slate-200 bg-slate-50 text-slate-900",
  in_progress: "border-blue-200 bg-blue-50 text-blue-900",
  problem: "border-red-200 bg-red-50 text-red-900",
  done: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export default function AdminDashboardClient() {
  const [items, setItems] = useState<Obstacle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchItems() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/obstacles", { cache: "no-store" });
        if (!res.ok) throw new Error(`Laden mislukt (${res.status})`);
        const data = (await res.json()) as Obstacle[];
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

  if (loading) return <p className="text-sm text-zinc-500">Dashboard laden...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className="flex flex-col gap-4">
      <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Admin dashboard</h2>
            <p className="text-sm text-zinc-500">Overzicht van alle obstacle statussen.</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-semibold">{items.length}</div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Totaal</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {statuses.map((status) => {
          const count = statusCounts[status.value] ?? 0;
          const percentage = items.length > 0 ? Math.round((count / items.length) * 100) : 0;

          return (
            <Link
              key={status.value}
              href={`/?status=${status.value}`}
              className={`rounded-xl border p-4 shadow-sm transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-zinc-400 ${statusCardStyles[status.value] ?? "border-zinc-200 bg-zinc-50 text-zinc-900"}`}
            >
              <div className="text-xs font-medium uppercase tracking-wide opacity-75">{status.label}</div>
              <div className="mt-3 text-4xl font-semibold leading-none">{count}</div>
              <div className="mt-3 text-sm opacity-75">{percentage}% van totaal</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
