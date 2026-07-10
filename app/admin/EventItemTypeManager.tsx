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
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-lg font-semibold">Types</h2>
      <p className="mb-3 text-sm text-zinc-500">Deze typen zijn beschikbaar voor alle Obstacles.</p>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <ul className="mb-4 divide-y divide-zinc-200 rounded border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
        {types.map((type) => (
          <li key={type.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
            <span className="inline-flex w-7 justify-center text-base">{eventItemIcon(type.icon)}</span>
            <span className="font-medium">{type.name}</span>
            <span className="text-zinc-500">{type.slug}</span>
            <label className="ml-auto inline-flex items-center gap-1">
              <input type="checkbox" checked={type.active} onChange={(event) => update(type.id, { active: event.target.checked }).catch((cause) => setError(cause.message))} />
              Actief
            </label>
          </li>
        ))}
      </ul>
      <form
        className="flex flex-col gap-2 sm:flex-row"
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
        <input className="rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700" value={name} onChange={(event) => setName(event.target.value)} placeholder="Nieuw type" required />
        <select className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" value={icon} onChange={(event) => setIcon(event.target.value)}>
          <option value="pin">● Pin</option>
          <option value="stage">★ Podium</option>
          <option value="parking">P Parkeren</option>
          <option value="aid">+ EHBO</option>
          <option value="food">◆ Horeca</option>
        </select>
        <button className="rounded bg-black px-3 py-1 text-white dark:bg-white dark:text-black" type="submit">Type toevoegen</button>
      </form>
    </section>
  );
}
