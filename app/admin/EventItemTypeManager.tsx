"use client";

import { useEffect, useState } from "react";
import { eventItemIcon, type EventItemType } from "../event-items/eventItemTypes";

export default function EventItemTypeManager() {
  const [types, setTypes] = useState<EventItemType[]>([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("pin");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/event-item-types", { cache: "no-store" });
    if (!response.ok) throw new Error("Typen laden mislukt");
    setTypes(await response.json());
  }

  useEffect(() => {
    let active = true;
    fetch("/api/event-item-types", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("Typen laden mislukt");
        return response.json() as Promise<EventItemType[]>;
      })
      .then((loaded) => { if (active) setTypes(loaded); })
      .catch((cause: Error) => { if (active) setError(cause.message); });
    return () => { active = false; };
  }, []);

  async function update(id: number, patch: Partial<EventItemType>) {
    const response = await fetch(`/api/event-item-types/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error("Type bijwerken mislukt");
    const updated = await response.json() as EventItemType;
    setTypes((current) => current.map((type) => type.id === id ? updated : type));
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div><h2 className="font-semibold tracking-tight">Beschikbare types</h2><p className="text-xs text-zinc-500">Deze typen zijn beschikbaar voor alle items.</p></div>
          <span className="grid h-9 min-w-9 place-items-center rounded-full bg-zinc-100 px-2 text-sm font-semibold dark:bg-zinc-900">{types.length}</span>
        </div>
        {error && <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
      <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {types.map((type) => (
          <li key={type.id} className="flex items-center gap-3 px-4 py-4 transition hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 sm:px-5">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-base font-semibold dark:bg-zinc-800">{eventItemIcon(type.icon)}</span>
            <span className="min-w-0">
              <span className="block font-medium">{type.name}</span>
              <span className="block truncate text-xs text-zinc-500">/{type.slug}</span>
            </span>
            <label className={`ml-auto inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ${type.active ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300" : "border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900"}`}>
              <input className="h-3.5 w-3.5 accent-emerald-600" type="checkbox" checked={type.active} onChange={(event) => update(type.id, { active: event.target.checked }).catch((cause) => setError(cause.message))} />
              {type.active ? "Actief" : "Inactief"}
            </label>
          </li>
        ))}
      </ul>
      </div>
      <div className="h-fit rounded-3xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-6">
        <div className="mb-5"><h2 className="font-semibold tracking-tight">Nieuw type</h2><p className="text-sm text-zinc-500">Voeg een categorie met een herkenbaar kaarticoon toe.</p></div>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          const response = await fetch("/api/event-item-types", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ name, icon }),
          });
          if (!response.ok) { setError("Type aanmaken mislukt; controleer of de naam uniek is."); return; }
          setName("");
          setIcon("pin");
          await load();
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">Naam
        <input className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 py-2 font-normal outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:focus:ring-zinc-800" value={name} onChange={(event) => setName(event.target.value)} placeholder="Bijv. Podium" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">Kaarticoon
        <select className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 py-2 font-normal outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:ring-zinc-800" value={icon} onChange={(event) => setIcon(event.target.value)}>
          <option value="pin">● Pin</option>
          <option value="stage">★ Podium</option>
          <option value="parking">P Parkeren</option>
          <option value="aid">+ EHBO</option>
          <option value="food">◆ Horeca</option>
        </select>
        </label>
        <button className="min-h-11 rounded-xl bg-zinc-950 px-4 py-2.5 font-medium text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white dark:text-zinc-950" type="submit">Type toevoegen</button>
      </form>
      </div>
    </section>
  );
}
