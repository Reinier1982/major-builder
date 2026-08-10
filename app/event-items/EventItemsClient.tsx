"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import TerrainMap from "./TerrainMap";
import {
  eventItemIcon,
  getEventItemLocation,
  hasEventItemLocation,
  statusDotClassByValue,
  statusLabelByValue,
  statuses,
  type EventItem,
  type EventItemLocation,
  type EventItemType,
} from "./eventItemTypes";

type EventItemImage = {
  id: number;
  eventItemId: number;
  url: string;
  label: string | null;
  uploadedBy: string | null;
};

type SessionUser = {
  id?: string;
  role?: string;
};

type AssignableUser = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

type AdminFilter = "all" | "planned" | "in_progress" | "problem" | "done";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function PhotoPicker({
  id,
  files,
  onChange,
  helperText,
}: {
  id: string;
  files: File[];
  onChange: (files: File[]) => void;
  helperText: string;
}) {
  const selectionText = files.length === 0
    ? "Nog geen foto's gekozen"
    : `${files.length} foto${files.length === 1 ? "" : "'s"} geselecteerd`;

  return (
    <div className="flex flex-col gap-2">
      <input
        id={id}
        type="file"
        multiple
        accept="image/*"
        className="sr-only"
        aria-describedby={`${id}-help ${id}-selection`}
        onChange={(event) => onChange(Array.from(event.target.files || []))}
      />
      <label
        htmlFor={id}
        className="flex min-h-20 w-full cursor-pointer items-center justify-center gap-3 rounded-lg border-2 border-dashed border-zinc-400 bg-zinc-50 px-4 py-5 text-center font-medium transition hover:border-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-900 dark:hover:border-zinc-400 dark:hover:bg-zinc-800"
      >
        <span aria-hidden="true" className="text-xl">📷</span>
        <span>{files.length === 0 ? "Foto's kiezen" : "Andere foto's kiezen"}</span>
      </label>
      <p id={`${id}-selection`} className={`text-center text-sm ${files.length > 0 ? "font-medium text-emerald-700 dark:text-emerald-400" : "text-zinc-500"}`} aria-live="polite">
        {selectionText}
      </p>
      <p id={`${id}-help`} className="text-center text-xs text-zinc-500">{helperText}</p>
    </div>
  );
}

export default function EventItemsClient({
  initialAdminFilter = "all",
  initialTypeFilter = "all",
  initialAssignedToMe = false,
}: {
  initialAdminFilter?: AdminFilter;
  initialTypeFilter?: string;
  initialAssignedToMe?: boolean;
}) {
  const { data: session } = useSession();
  const role = (session?.user as SessionUser | undefined)?.role ?? "builder";
  const userId = (session?.user as SessionUser | undefined)?.id ?? null;
  const [items, setItems] = useState<EventItem[]>([]);
  const [types, setTypes] = useState<EventItemType[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cComments, setCComments] = useState("");
  const [cTypeId, setCTypeId] = useState<number | "">("");
  const [cAssignedToId, setCAssignedToId] = useState("");
  const [cStatus, setCStatus] = useState("planned");
  const [cOrder, setCOrder] = useState<number | "">("");
  const [cFiles, setCFiles] = useState<File[]>([]);
  const [cSubmitting, setCSubmitting] = useState(false);

  // edit dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [eId, setEId] = useState<number | null>(null);
  const [eName, setEName] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eComments, setEComments] = useState("");
  const [eTypeId, setETypeId] = useState<number | "">("");
  const [eAssignedToId, setEAssignedToId] = useState("");
  const [eProblemDescription, setEProblemDescription] = useState("");
  const [eStatus, setEStatus] = useState("planned");
  const [eOrder, setEOrder] = useState<number | "">("");
  const [eLocationLat, setELocationLat] = useState<number | null>(null);
  const [eLocationLng, setELocationLng] = useState<number | null>(null);
  const [eSubmitting, setESubmitting] = useState(false);
  const [eImages, setEImages] = useState<EventItemImage[]>([]);
  const [eUploading, setEUploading] = useState(false);
  const [eNewFiles, setENewFiles] = useState<File[]>([]);
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationDraft, setLocationDraft] = useState<EventItemLocation | null>(null);
  const [locationSubmitting, setLocationSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{ targetId: number; position: "before" | "after" } | null>(null);
  const [reordering, setReordering] = useState(false);
  const [adminFilter, setAdminFilter] = useState<AdminFilter>(initialAdminFilter);
  const [assignedToMe, setAssignedToMe] = useState(initialAssignedToMe);
  const [typeFilter, setTypeFilter] = useState(initialTypeFilter);
  const [searchQuery, setSearchQuery] = useState("");
  const [missingLocationOnly, setMissingLocationOnly] = useState(false);
  const [eventOverviewExpanded, setEventOverviewExpanded] = useState(true);
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ id: number; name: string; problemDescription: string | null } | null>(null);
  const [sStatus, setSStatus] = useState("planned");
  const [sProblemDescription, setSProblemDescription] = useState("");
  const [sSubmitting, setSSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewUrl(null);
    }
    if (previewUrl) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [previewUrl]);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ao = a.order ?? 1e9;
      const bo = b.order ?? 1e9;
      if (ao !== bo) return ao - bo;
      return a.id - b.id;
    });
  }, [items]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { planned: 0, in_progress: 0, problem: 0, done: 0 };
    for (const item of items) counts[item.status] = (counts[item.status] ?? 0) + 1;
    return counts;
  }, [items]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();
    return sorted.filter((o) => {
      const matchesStatus = adminFilter === "all" || o.status === adminFilter;
      const matchesType = typeFilter === "all" || o.type.slug === typeFilter;
      const matchesSearch = !normalizedSearch || o.name.toLowerCase().includes(normalizedSearch);
      const matchesLocation = !missingLocationOnly || !hasEventItemLocation(o);
      const matchesAssignee = !assignedToMe || o.assignedToId === userId;
      return matchesStatus && matchesType && matchesSearch && matchesLocation && matchesAssignee;
    });
  }, [sorted, adminFilter, typeFilter, searchQuery, missingLocationOnly, assignedToMe, userId]);

  function getNextOrderValue() {
    const numericOrders = items.map((i) => i.order).filter((v): v is number => typeof v === "number");
    if (numericOrders.length === 0) return 1;
    return Math.max(...numericOrders) + 1;
  }

  useEffect(() => {
    let active = true;
    Promise.all([
        fetch("/api/event-items", { cache: "no-store" }),
        fetch("/api/event-item-types", { cache: "no-store" }),
      ])
      .then(async ([itemsResponse, typesResponse]) => {
      if (!itemsResponse.ok || !typesResponse.ok) throw new Error(`Laden mislukt (${itemsResponse.status})`);
      const data = await itemsResponse.json();
      const loadedTypes = await typesResponse.json() as EventItemType[];
      if (!active) return;
      setItems(data);
      setTypes(loadedTypes);
      setCTypeId((current) => current || loadedTypes.find((type) => type.slug === "obstacle")?.id || loadedTypes[0]?.id || "");
      })
      .catch((cause: unknown) => { if (active) setError(getErrorMessage(cause, "Obstacles laden mislukt")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (role !== "admin") return;
    let active = true;
    fetch("/api/users", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Gebruikers laden mislukt (${response.status})`);
        return response.json() as Promise<AssignableUser[]>;
      })
      .then((users) => { if (active) setAssignableUsers(users); })
      .catch((cause: unknown) => { if (active) setError(getErrorMessage(cause, "Gebruikers laden mislukt")); });
    return () => { active = false; };
  }, [role]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!cName.trim() || cTypeId === "") return;
    setCSubmitting(true);
    try {
      const res = await fetch("/api/event-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cName.trim(),
          typeId: cTypeId,
          assignedToId: cAssignedToId || null,
          description: cDescription.trim() || null,
          comments: cComments.trim() || null,
          status: cStatus,
          order: cOrder === "" ? null : Number(cOrder),
        }),
      });
      if (!res.ok) throw new Error("Aanmaken mislukt");
      const created = (await res.json()) as EventItem;
      setItems((prev) => [...prev, created]);
      if (created?.id && cFiles.length > 0) {
        const fd = new FormData();
        for (const f of cFiles) fd.append("image", f);
        const upRes = await fetch(`/api/event-items/${created.id}/images`, { method: "POST", body: fd });
        if (!upRes.ok) throw new Error("Afbeelding uploaden mislukt");
      }
      // reset & close
      setShowCreate(false);
      setCName("");
      setCDescription("");
      setCComments("");
      setCStatus("planned");
      setCAssignedToId("");
      setCOrder("");
      setCFiles([]);
    } catch (e: unknown) {
      setError(getErrorMessage(e, "Obstacle aanmaken mislukt"));
    } finally {
      setCSubmitting(false);
    }
  }

  async function onUpdate(id: number, patch: Partial<EventItem>) {
    const res = await fetch(`/api/event-items/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Bijwerken mislukt");
    const updated = (await res.json()) as EventItem;
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  async function fetchImages(eventItemId: number) {
    const res = await fetch(`/api/event-items/${eventItemId}/images`, { cache: "no-store" });
    if (!res.ok) throw new Error("Afbeeldingen laden mislukt");
    const data = (await res.json()) as EventItemImage[];
    setEImages(data);
  }

  async function onDelete(id: number) {
    const res = await fetch(`/api/event-items/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Verwijderen mislukt");
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function onReorderByDrag(draggedId: number, targetId: number, position: "before" | "after") {
    if (role !== "admin" || reordering) return;

    const current = [...sorted];
    const fromIndex = current.findIndex((o) => o.id === draggedId);
    const toIndex = current.findIndex((o) => o.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...current];
    let insertIndex = toIndex + (position === "after" ? 1 : 0);
    const [moved] = next.splice(fromIndex, 1);
    if (fromIndex < insertIndex) insertIndex -= 1;
    if (insertIndex === fromIndex) {
      setDraggingId(null);
      setDropIndicator(null);
      return;
    }
    next.splice(insertIndex, 0, moved);

    const updates = next.map((o, idx) => ({ id: o.id, order: idx + 1 }));
    const orderById = new Map(updates.map((u) => [u.id, u.order]));
    const previousItems = items;

    setItems((prev) =>
      prev.map((i) => (orderById.has(i.id) ? { ...i, order: orderById.get(i.id)! } : i))
    );

    setReordering(true);
    try {
      await Promise.all(
        updates.map(async (u) => {
          const res = await fetch(`/api/event-items/${u.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: u.order }),
          });
          if (!res.ok) throw new Error("Volgorde opslaan mislukt");
        })
      );
    } catch (e: unknown) {
      setItems(previousItems);
      setError(getErrorMessage(e, "Volgorde opslaan mislukt"));
    } finally {
      setReordering(false);
      setDraggingId(null);
      setDropIndicator(null);
    }
  }

  function dropIndicatorFromPoint(
    clientX: number,
    clientY: number
  ): { targetId: number; position: "before" | "after" } | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const row = el?.closest?.("[data-event-item-id]") as HTMLElement | null;
    if (!row) return null;
    const id = Number(row.dataset.eventItemId);
    if (!Number.isFinite(id)) return null;
    const rect = row.getBoundingClientRect();
    const position = clientY < rect.top + rect.height / 2 ? "before" : "after";
    return { targetId: id, position };
  }

  const editLocation = getEventItemLocation({ locationLat: eLocationLat, locationLng: eLocationLng });
  const locationContextItems = useMemo(() => {
    return items.filter((item) => item.id !== eId && hasEventItemLocation(item));
  }, [items, eId]);
  const activeFilterCount = Number(searchQuery.trim().length > 0)
    + Number(typeFilter !== "all")
    + Number(adminFilter !== "all")
    + Number(missingLocationOnly)
    + Number(role === "admin" && assignedToMe);

  if (loading) return <div className="h-72 animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div>;

  return (
    <section className="flex flex-col gap-3 sm:gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-4 text-white shadow-xl shadow-zinc-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10 bg-white/5" />
        <div className="pointer-events-none absolute -bottom-28 right-24 h-56 w-56 rounded-full border border-white/10" />
        <button
          type="button"
          className="relative flex w-full items-center justify-between text-left"
          aria-expanded={eventOverviewExpanded}
          aria-controls="event-overview-content event-overview-stats"
          onClick={() => setEventOverviewExpanded((expanded) => !expanded)}
        >
          <span><span className="block text-sm font-semibold">Eventopbouw</span><span className="block text-xs text-zinc-400">{items.length} items</span></span>
          <svg className={`h-5 w-5 text-zinc-400 transition-transform ${eventOverviewExpanded ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
        </button>
        <div id="event-overview-content" className={`${eventOverviewExpanded ? "relative mt-5 flex" : "hidden"} flex-col gap-7 sm:flex-row sm:items-end sm:justify-between`}>
        <div className="max-w-xl">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Alle items</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-300 sm:text-base">Plan, verdeel en volg ieder onderdeel van het evenement vanuit één overzicht.</p>
        </div>
        {role === "admin" && (
        <button
          className="min-h-11 w-full rounded-xl bg-white px-4 py-2.5 font-medium text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:w-auto"
          onClick={() => {
            setCName("");
            setCDescription("");
            setCComments("");
            setCTypeId(types.find((type) => type.slug === "obstacle")?.id ?? types[0]?.id ?? "");
            setCStatus("planned");
            setCAssignedToId("");
            setCOrder(getNextOrderValue());
            setCFiles([]);
            setShowCreate(true);
          }}
        >
          <span className="mr-2" aria-hidden="true">＋</span>Nieuw item
        </button>
        )}
        </div>
        <div id="event-overview-stats" className={`${eventOverviewExpanded ? "relative mt-5 grid" : "hidden"} grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm`}>
          <div className="px-3 first:pl-0"><div className="text-2xl font-semibold">{items.length}</div><div className="text-xs text-zinc-300">Totaal</div></div>
          <div className="px-3"><div className="text-2xl font-semibold text-emerald-400">{statusCounts.done ?? 0}</div><div className="text-xs text-zinc-300">Afgerond</div></div>
          <div className="px-3"><div className={`text-2xl font-semibold ${(statusCounts.problem ?? 0) > 0 ? "text-rose-400" : "text-zinc-100"}`}>{statusCounts.problem ?? 0}</div><div className="text-xs text-zinc-300">Problemen</div></div>
        </div>
      </div>
      <div className="rounded-3xl border border-zinc-200/80 bg-white/90 p-4 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sm:p-5">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          aria-expanded={filtersExpanded}
          aria-controls="event-item-filters"
          onClick={() => setFiltersExpanded((expanded) => !expanded)}
        >
          <span><span className="block text-sm font-semibold">Filter items</span><span className="block text-xs text-zinc-500">{activeFilterCount > 0 ? `${activeFilterCount} actief` : "Zoeken en filteren"}</span></span>
          <svg className={`h-5 w-5 text-zinc-400 transition-transform ${filtersExpanded ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
        </button>
      <div id="event-item-filters" className={`${filtersExpanded ? "mt-4 block" : "hidden"}`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(16rem,1fr)_auto_auto] lg:items-end">
        <div className="flex flex-col gap-1 sm:min-w-64">
          <label className="text-sm" htmlFor="event-item-search">Zoeken</label>
          <input
            id="event-item-search"
            type="search"
            className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op naam..."
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm" htmlFor="event-item-type-filter">Type</label>
          <select
            id="event-item-type-filter"
            className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-800"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">Alle typen</option>
            {types.map((type) => <option key={type.id} value={type.slug}>{type.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm" htmlFor="event-item-status-filter">Status</label>
          <select
            id="event-item-status-filter"
            className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-800"
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value as AdminFilter)}
          >
            <option value="all">Alles</option>
            <option value="planned">Gepland</option>
            <option value="in_progress">Aan het opbouwen</option>
            <option value="problem">Probleem</option>
            <option value="done">Klaar</option>
          </select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
        <span className="mr-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Extra filters</span>
        <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition ${missingLocationOnly ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"}`}>
          <input
            type="checkbox"
            className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100"
            checked={missingLocationOnly}
            onChange={(e) => setMissingLocationOnly(e.target.checked)}
          />
          <span aria-hidden="true">⌖</span>
          Zonder locatie
        </label>
        {role === "admin" && (
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium shadow-sm transition ${assignedToMe ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900" : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-500 dark:hover:bg-zinc-800"}`}>
            <input
              type="checkbox"
              className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100"
              checked={assignedToMe}
              onChange={(e) => setAssignedToMe(e.target.checked)}
            />
            <span aria-hidden="true">●</span>
            Aan mij toegewezen
          </label>
        )}
      </div>
      </div>
      </div>
      {role === "admin" && (
        <p className="hidden px-1 text-xs text-zinc-500 sm:block">Sleep via het handvat (`⋮⋮`) om de volgorde te wijzigen.</p>
      )}

      <ul className="flex flex-col gap-3">
        {visibleItems.map((o) => (
          <li
            key={o.id}
            id={`event-item-${o.id}`}
            data-event-item-id={o.id}
            className={`group relative flex touch-pan-y flex-col gap-2 rounded-2xl border border-zinc-200/80 bg-white/90 p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950/80 dark:hover:border-zinc-700 sm:gap-3 sm:p-5 ${draggingId === o.id ? "opacity-60" : ""}`}
            onDragEnd={() => {
              setDraggingId(null);
              setDropIndicator(null);
            }}
            onDragOver={(ev) => {
              if (role === "admin" && !reordering) {
                ev.preventDefault();
                ev.dataTransfer.dropEffect = "move";
                const indicator = dropIndicatorFromPoint(ev.clientX, ev.clientY);
                if (indicator && indicator.targetId !== draggingId) {
                  setDropIndicator(indicator);
                } else {
                  setDropIndicator(null);
                }
              }
            }}
            onDrop={async (ev) => {
              ev.preventDefault();
              const sourceId = Number(ev.dataTransfer.getData("text/plain"));
              const draggedId = Number.isFinite(sourceId) ? sourceId : draggingId;
              if (draggedId === null) return;
              const indicator = dropIndicatorFromPoint(ev.clientX, ev.clientY);
              if (!indicator || indicator.targetId === draggedId) {
                setDraggingId(null);
                setDropIndicator(null);
                return;
              }
              await onReorderByDrag(draggedId, indicator.targetId, indicator.position);
            }}
            onTouchMove={(ev) => {
              if (role !== "admin" || reordering || draggingId === null) return;
              const touch = ev.touches[0];
              if (!touch) return;
              const indicator = dropIndicatorFromPoint(touch.clientX, touch.clientY);
              if (indicator && indicator.targetId !== draggingId) {
                setDropIndicator(indicator);
                ev.preventDefault();
              } else {
                setDropIndicator(null);
              }
            }}
            onTouchEnd={async () => {
              if (role !== "admin" || reordering || draggingId === null) return;
              const draggedId = draggingId;
              const indicator = dropIndicator;
              if (indicator && indicator.targetId !== draggedId) {
                await onReorderByDrag(draggedId, indicator.targetId, indicator.position);
              } else {
                setDraggingId(null);
                setDropIndicator(null);
              }
            }}
          >
            {dropIndicator?.targetId === o.id && dropIndicator.position === "before" && (
              <div className="pointer-events-none absolute left-3 right-3 -top-px h-1 rounded-full bg-zinc-500" />
            )}
            {dropIndicator?.targetId === o.id && dropIndicator.position === "after" && (
              <div className="pointer-events-none absolute left-3 right-3 -bottom-px h-1 rounded-full bg-zinc-500" />
            )}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:flex sm:flex-row sm:gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-sm font-semibold dark:bg-zinc-800 sm:h-11 sm:w-11 sm:rounded-xl sm:text-base" title={o.type.name}>
                  {eventItemIcon(o.type.icon)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-base tracking-tight">{o.name}</strong>
                    <span className="text-xs text-zinc-400">#{o.order ?? "-"}</span>
                  </div>
                  <div className="mt-0.5 flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] text-zinc-500 sm:mt-1 sm:gap-2 sm:text-xs">
                    <span className="shrink-0">{o.type.name}</span>
                    {role === "admin" && <><span className="shrink-0" aria-hidden="true">·</span><span className="truncate">{o.assignedTo ? o.assignedTo.name || o.assignedTo.email : "Niet toegewezen"}</span></>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-1.5 sm:ml-auto sm:gap-2">
                <span
                  className={`hidden h-6 w-6 items-center justify-center rounded-full border text-xs sm:inline-flex ${hasEventItemLocation(o) ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900"}`}
                  aria-label={hasEventItemLocation(o) ? "Locatie ingesteld" : "Geen locatie ingesteld"}
                  title={hasEventItemLocation(o) ? "Locatie ingesteld" : "Geen locatie ingesteld"}
                >
                  {hasEventItemLocation(o) ? "⌖" : "○"}
                </span>
                <span className="inline-flex w-32 shrink-0 items-center justify-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium dark:border-zinc-800 dark:bg-zinc-900 sm:w-36 sm:gap-1.5 sm:px-2.5 sm:text-xs">
                  <span className={`h-2 w-2 rounded-full ${statusDotClassByValue[o.status] ?? statusDotClassByValue.planned}`} />
                  {statusLabelByValue[o.status] ?? o.status}
                </span>
              </div>
              <div className="col-span-1 flex flex-wrap items-center gap-2 sm:col-auto">
                <button
                  className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-sm font-medium transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 sm:flex sm:w-auto sm:items-center sm:px-3 sm:py-2"
                  aria-label="Obstacle bewerken"
                  title="Obstacle bewerken"
                  onClick={() => {
                    setEId(o.id);
                    setEName(o.name);
                    setEDescription(o.description ?? "");
                    setEComments(o.comments ?? "");
                    setETypeId(o.typeId);
                    setEAssignedToId(o.assignedToId ?? "");
                    setEProblemDescription(o.problemDescription ?? "");
                    setEStatus(o.status);
                    setEOrder(o.order ?? "");
                    setELocationLat(o.locationLat);
                    setELocationLng(o.locationLng);
                    setShowEdit(true);
                    fetchImages(o.id).catch((e) => setError(e.message ?? "Afbeeldingen laden mislukt"));
                  }}
                >
                  <svg className="h-5 w-5 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                  </svg>
                  <span className="hidden sm:inline">Bewerken</span>
                </button>
                {o.status !== "done" && (
                  <button
                    className="grid h-10 w-10 place-items-center rounded-xl border border-zinc-200 bg-white text-sm font-medium transition hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 sm:flex sm:w-auto sm:items-center sm:px-3 sm:py-2"
                    aria-label="Status aanpassen"
                    title="Status aanpassen"
                    onClick={() => {
                      setStatusTarget({
                        id: o.id,
                        name: o.name,
                        problemDescription: o.problemDescription,
                      });
                      setSStatus(o.status);
                      setSProblemDescription(o.problemDescription ?? "");
                    }}
                  >
                    <svg className="h-5 w-5 sm:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
                      <circle cx="16" cy="7" r="2" />
                      <circle cx="8" cy="17" r="2" />
                    </svg>
                    <span className="hidden sm:inline">Status</span>
                  </button>
                )}
                {role === "admin" && (
                <button
                  className="grid h-10 w-10 place-items-center rounded-xl border border-red-200 text-red-700 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                  aria-label="Obstacle verwijderen"
                  title="Obstacle verwijderen"
                  onClick={() => {
                    setDeleteTarget({ id: o.id, name: o.name });
                  }}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M9 3a2 2 0 0 0-2 2v1H4.75a1 1 0 1 0 0 2h.54l.8 11.17A2 2 0 0 0 8.08 21h7.84a2 2 0 0 0 1.99-1.83L18.71 8h.54a1 1 0 1 0 0-2H17V5a2 2 0 0 0-2-2H9Zm0 3V5h6v1H9Zm.5 4a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Zm5 0a1 1 0 0 1 1 1v6a1 1 0 1 1-2 0v-6a1 1 0 0 1 1-1Z" />
                  </svg>
                </button>
                )}
              </div>
              {role === "admin" && (
                <span
                  role="button"
                  aria-label="Sleep handvat"
                  title="Sleep om te herschikken"
                  className="inline-flex h-10 w-10 shrink-0 touch-none cursor-grab select-none items-center justify-center justify-self-end self-end rounded-xl border border-zinc-200 bg-zinc-100 p-0 text-xs font-medium text-zinc-700 active:cursor-grabbing dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 sm:w-auto sm:self-center sm:px-3"
                  draggable={!reordering}
                  onDragStart={(ev) => {
                    ev.dataTransfer.effectAllowed = "move";
                    ev.dataTransfer.setData("text/plain", String(o.id));
                    setDraggingId(o.id);
                    setDropIndicator(null);
                  }}
                  onTouchStart={(ev) => {
                    if (reordering) return;
                    setDraggingId(o.id);
                    setDropIndicator(null);
                    ev.preventDefault();
                  }}
                >
                  <span className="text-sm leading-none">⋮⋮</span>
                </span>
              )}
            </div>
            {o.comments && <p className="line-clamp-1 text-xs text-zinc-500 sm:line-clamp-none sm:text-sm"><span className="font-medium">Opmerkingen:</span> {o.comments}</p>}
            {o.status === "problem" && o.problemDescription && (
              <p className="text-sm text-red-700 dark:text-red-300">{o.problemDescription}</p>
            )}
          </li>
        ))}
        {visibleItems.length === 0 && searchQuery.trim() && (
          <li className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/60">Geen items gevonden met deze filters.</li>
        )}
        {visibleItems.length === 0 && !searchQuery.trim() && (
          <li className="rounded-2xl border border-dashed border-zinc-300 bg-white/70 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/60">
            {role === "admin" ? "Nog geen Obstacles. Voeg hierboven je eerste toe." : "Er zijn geen items aan jou toegewezen"}
          </li>
        )}
      </ul>
      {/* Create Dialog */}
      {showCreate && role === "admin" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <form
            onSubmit={onCreate}
            className="relative z-10 max-h-[92dvh] w-full min-w-0 max-w-lg overflow-x-hidden overflow-y-auto rounded-t-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold mb-3">Nieuw</h3>
            <label className="text-sm">Type</label>
            <select
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 w-full"
              value={cTypeId}
              onChange={(e) => setCTypeId(Number(e.target.value))}
              required
            >
              {types.filter((type) => type.active).map((type) => <option key={type.id} value={type.id}>{eventItemIcon(type.icon)} {type.name}</option>)}
            </select>
            <label className="text-sm">Bouwer</label>
            <select
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 w-full"
              value={cAssignedToId}
              onChange={(e) => setCAssignedToId(e.target.value)}
            >
              <option value="">Niet toegewezen</option>
              {assignableUsers.map((user) => (
                <option key={user.id} value={user.id}>{user.name || user.email}</option>
              ))}
            </select>
            <label className="text-sm">Naam</label>
            <input
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="bijv. Monkey Bars"
              required
            />
            <label className="text-sm">Beschrijving</label>
            <textarea
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
              value={cDescription}
              onChange={(e) => setCDescription(e.target.value)}
              placeholder="Materialen, afmetingen, notities..."
            />
            <label className="text-sm">Opmerkingen</label>
            <textarea
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
              value={cComments}
              onChange={(e) => setCComments(e.target.value)}
              placeholder="Algemene opmerkingen..."
            />
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="flex flex-col">
                <label className="text-sm">Status</label>
                <select
                  className="rounded border border-zinc-300 bg-white px-2 py-1 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  value={cStatus}
                  onChange={(e) => setCStatus(e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col">
                <label className="text-sm">Volgorde</label>
                <input
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-24"
                  type="number"
                  value={cOrder}
                  onChange={(e) => setCOrder(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="bijv. 1"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-sm font-medium block mb-2">Foto&apos;s</label>
              <PhotoPicker
                id="create-images"
                files={cFiles}
                onChange={setCFiles}
                helperText="De geselecteerde foto's worden toegevoegd wanneer je op Aanmaken tikt."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded border" onClick={() => {
                setCFiles([]);
                setShowCreate(false);
              }}>
                Annuleren
              </button>
              <button
                type="submit"
                disabled={cSubmitting}
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60 dark:bg-white dark:text-black"
              >
                {cSubmitting ? "Bezig met aanmaken..." : "Aanmaken"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Dialog */}
      {showEdit && eId !== null && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => (eSubmitting ? null : setShowEdit(false))} />
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (eId === null) return;
              setESubmitting(true);
              try {
                const patch =
                  role === "admin"
                    ? {
                        typeId: Number(eTypeId),
                        assignedToId: eAssignedToId || null,
                        name: eName,
                        description: eDescription.trim() || null,
                        comments: eComments.trim() || null,
                        problemDescription: eStatus === "problem" ? eProblemDescription.trim() || null : null,
                        status: eStatus,
                        order: eOrder === "" ? null : Number(eOrder),
                      }
                    : {
                        status: eStatus,
                        problemDescription: eStatus === "problem" ? eProblemDescription.trim() || null : null,
                      };
                await onUpdate(eId, patch);
                setShowEdit(false);
              } catch (e: unknown) {
                setError(getErrorMessage(e, "Bijwerken mislukt"));
              } finally {
                setESubmitting(false);
              }
            }}
            className="relative z-10 max-h-[92dvh] w-full min-w-0 max-w-4xl overflow-x-hidden overflow-y-auto rounded-t-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded sm:p-5 lg:p-6"
            role="dialog"
            aria-modal="true"
          >
            <button
              type="submit"
              aria-label="Wijzigingen opslaan"
              title="Opslaan"
              disabled={eSubmitting}
              className="absolute right-14 top-3 grid h-9 w-9 place-items-center rounded-full border border-black bg-black text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 3h10l3 3v11H4Z" />
                <path d="M7 3v5h7V3M7 17v-5h6v5" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Modal sluiten"
              title="Sluiten"
              disabled={eSubmitting}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border border-zinc-300 bg-transparent text-zinc-900 shadow-sm transition hover:border-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-white dark:hover:border-zinc-500 dark:hover:bg-zinc-800"
              onClick={() => setShowEdit(false)}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 5l10 10M15 5 5 15" />
              </svg>
            </button>
            <h3 className="mb-5 pr-24 text-lg font-semibold">{role === "admin" ? "Obstacle bewerken" : "Obstacle status aanpassen"}</h3>
            <div className="grid grid-cols-1 gap-x-5 gap-y-4 md:grid-cols-2">
              {role === "admin" && (
                <div className="min-w-0">
                  <label className="mb-1 block text-sm">Type</label>
                  <select
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    value={eTypeId}
                    onChange={(e) => setETypeId(Number(e.target.value))}
                  >
                    {types.map((type) => <option key={type.id} value={type.id}>{eventItemIcon(type.icon)} {type.name}</option>)}
                  </select>
                </div>
              )}
              {role === "admin" && (
                <div className="min-w-0">
                  <label className="mb-1 block text-sm">Bouwer</label>
                  <select
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    value={eAssignedToId}
                    onChange={(e) => setEAssignedToId(e.target.value)}
                  >
                    <option value="">Niet toegewezen</option>
                    {assignableUsers.map((user) => (
                      <option key={user.id} value={user.id}>{user.name || user.email}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="min-w-0 md:col-span-2">
                <label className="mb-1 block text-sm">Naam</label>
                <input
                  className="w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                  value={eName}
                  onChange={(e) => setEName(e.target.value)}
                  disabled={role !== "admin"}
                  required
                />
              </div>
              <div className={`min-w-0 ${role === "admin" ? "" : "md:col-span-2"}`}>
                <label className="mb-1 block text-sm">Beschrijving</label>
                <textarea
                  className="min-h-24 w-full resize-y rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                  value={eDescription}
                  onChange={(e) => setEDescription(e.target.value)}
                  disabled={role !== "admin"}
                />
              </div>
              {role === "admin" && (
                <div className="min-w-0">
                  <label className="mb-1 block text-sm">Opmerkingen</label>
                  <textarea
                    className="min-h-24 w-full resize-y rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                    value={eComments}
                    onChange={(e) => setEComments(e.target.value)}
                  />
                </div>
              )}
              <div className={`min-w-0 ${role === "admin" ? "" : "md:col-span-2"}`}>
                <label className="mb-1 block text-sm">Status</label>
                <select
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                  value={eStatus}
                  onChange={(e) => setEStatus(e.target.value)}
                >
                  {statuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              {role === "admin" && (
                <div className="min-w-0">
                  <label className="mb-1 block text-sm">Volgorde</label>
                  <input
                    className="w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                    type="number"
                    value={eOrder}
                    onChange={(e) => setEOrder(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              )}
              {eStatus === "problem" && (
                <div className="min-w-0 md:col-span-2">
                  <label className="mb-1 block text-sm">Probleembeschrijving</label>
                  <textarea
                    className="min-h-24 w-full resize-y rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
                    value={eProblemDescription}
                    onChange={(e) => setEProblemDescription(e.target.value)}
                    placeholder="Beschrijf het probleem..."
                  />
                </div>
              )}
            </div>
            <div className="my-5 sm:rounded-xl sm:border sm:border-zinc-200 sm:p-4 sm:dark:border-zinc-800">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-medium">Locatie</h4>
                  <p className="text-sm text-zinc-500">
                    {editLocation ? "Pin ingesteld op de terreinplattegrond." : "Nog geen pin ingesteld."}
                  </p>
                </div>
                {role === "admin" && (
                  <button
                    type="button"
                    className="px-3 py-2 rounded border border-zinc-300 dark:border-zinc-700"
                    onClick={() => {
                      setLocationDraft(editLocation);
                      setShowLocationDialog(true);
                    }}
                  >
                    Locatie instellen
                  </button>
                )}
              </div>
              {editLocation && (
                <div className="mt-3">
                  <TerrainMap eventItems={locationContextItems} editablePoint={editLocation} className="event-item-edit-map-preview" />
                </div>
              )}
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:justify-end">
              <button type="button" disabled={eSubmitting} className="min-h-11 w-full rounded-xl border px-3 py-2 font-medium disabled:opacity-50 sm:w-auto" onClick={() => setShowEdit(false)}>
                Annuleren
              </button>
              <button
                type="submit"
                disabled={eSubmitting}
                className="min-h-11 w-full rounded-xl bg-black px-3 py-2 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-black sm:w-auto"
              >
                {eSubmitting ? "Opslaan..." : "Opslaan"}
              </button>
            </div>

            {/* Images section */}
            <div className="mt-4 border-t pt-3">
              <h4 className="font-medium mb-2">Afbeeldingen</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                {eImages.map((img) => (
                  <div key={img.id} className="relative group border rounded overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.label ?? "Obstacle afbeelding"}
                      className="w-full h-24 object-cover cursor-zoom-in"
                      onClick={() => setPreviewUrl(img.url)}
                    />
                    {(role === "admin" || img.uploadedBy === userId) && (
                      <button
                        type="button"
                        className="absolute top-1 right-1 px-1.5 py-0.5 text-xs rounded bg-black/70 text-white opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition"
                        aria-label="Afbeelding verwijderen"
                        title="Afbeelding verwijderen"
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/event-items/${eId}/images/${img.id}`, { method: "DELETE" });
                            if (!res.ok) throw new Error("Verwijderen mislukt");
                            setEImages((prev) => prev.filter((i) => i.id !== img.id));
                          } catch (e: unknown) {
                            setError(getErrorMessage(e, "Afbeelding verwijderen mislukt"));
                          }
                        }}
                      >
                        <span className="text-base leading-none">🗑</span>
                      </button>
                    )}
                  </div>
                ))}
                {eImages.length === 0 && <p className="col-span-3 text-sm text-zinc-500">Nog geen afbeeldingen.</p>}
              </div>

              <div className="flex flex-col items-center gap-2">
                {(role === "admin" || role === "builder") && (
                  <>
                    <PhotoPicker
                      id="edit-images"
                      files={eNewFiles}
                      onChange={setENewFiles}
                      helperText="Kies één of meer foto's en tik daarna op Uploaden."
                    />
                    <div className="w-full">
                      <button
                        type="button"
                        disabled={eUploading || eNewFiles.length === 0}
                        className="min-h-12 w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 dark:bg-white dark:text-black dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
                        onClick={async () => {
                          if (eId === null || eNewFiles.length === 0) return;
                          setEUploading(true);
                          try {
                            const fd = new FormData();
                            for (const f of eNewFiles) fd.append("image", f);
                            const res = await fetch(`/api/event-items/${eId}/images`, { method: "POST", body: fd });
                            if (!res.ok) throw new Error("Uploaden mislukt");
                            const added = (await res.json()) as EventItemImage[];
                            setEImages((prev) => [...prev, ...added]);
                            setENewFiles([]);
                            const input = document.getElementById("edit-images") as HTMLInputElement | null;
                            if (input) input.value = "";
                          } catch (e: unknown) {
                            setError(getErrorMessage(e, "Afbeeldingen uploaden mislukt"));
                          } finally {
                            setEUploading(false);
                          }
                        }}
                      >
                        {eUploading ? "Foto's uploaden..." : eNewFiles.length > 0 ? `${eNewFiles.length} foto${eNewFiles.length === 1 ? "" : "'s"} uploaden` : "Kies eerst foto's"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Location Dialog */}
      {showLocationDialog && eId !== null && role === "admin" && (
        <div className="fixed inset-0 z-[75] flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => (locationSubmitting ? null : setShowLocationDialog(false))} />
          <div
            className="relative z-10 max-h-[92dvh] w-full min-w-0 max-w-2xl overflow-x-hidden overflow-y-auto rounded-t-xl border border-zinc-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded"
            role="dialog"
            aria-modal="true"
            aria-label="Obstacle locatie instellen"
          >
            <h3 className="text-lg font-semibold mb-2">Locatie instellen</h3>
            <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-300">
              Klik op de plattegrond of sleep de pin naar de juiste plek.
            </p>
            <TerrainMap
              eventItems={locationContextItems}
              editablePoint={locationDraft}
              onEditablePointChange={setLocationDraft}
              className="event-item-location-map"
            />
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {editLocation && (
                <button
                  type="button"
                  className="px-3 py-2 rounded border border-red-300 text-red-700 disabled:opacity-60"
                  disabled={locationSubmitting}
                  onClick={async () => {
                    setLocationSubmitting(true);
                    try {
                      await onUpdate(eId, { locationLat: null, locationLng: null });
                      setELocationLat(null);
                      setELocationLng(null);
                      setLocationDraft(null);
                      setShowLocationDialog(false);
                    } catch (e: unknown) {
                      setError(e instanceof Error ? e.message : "Locatie verwijderen mislukt");
                    } finally {
                      setLocationSubmitting(false);
                    }
                  }}
                >
                  Locatie verwijderen
                </button>
              )}
              <button
                type="button"
                className="px-3 py-2 rounded border"
                disabled={locationSubmitting}
                onClick={() => setShowLocationDialog(false)}
              >
                Annuleren
              </button>
              <button
                type="button"
                disabled={locationSubmitting || !locationDraft}
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60 dark:bg-white dark:text-black"
                onClick={async () => {
                  if (!locationDraft) return;
                  setLocationSubmitting(true);
                  try {
                    await onUpdate(eId, { locationLat: locationDraft.lat, locationLng: locationDraft.lng });
                    setELocationLat(locationDraft.lat);
                    setELocationLng(locationDraft.lng);
                    setShowLocationDialog(false);
                  } catch (e: unknown) {
                    setError(e instanceof Error ? e.message : "Locatie opslaan mislukt");
                  } finally {
                    setLocationSubmitting(false);
                  }
                }}
              >
                {locationSubmitting ? "Opslaan..." : "Locatie opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Status Dialog */}
      {statusTarget && (
        <div className="fixed inset-0 z-[65] flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => (sSubmitting ? null : setStatusTarget(null))} />
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              setSSubmitting(true);
              try {
                await onUpdate(statusTarget.id, {
                  status: sStatus,
                  problemDescription: sStatus === "problem" ? sProblemDescription.trim() || null : null,
                });
                setStatusTarget(null);
              } catch (e: unknown) {
                setError(e instanceof Error ? e.message : "Status bijwerken mislukt");
              } finally {
                setSSubmitting(false);
              }
            }}
            className="relative z-10 w-full max-w-md rounded-t-xl sm:rounded bg-white p-4 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            role="dialog"
            aria-modal="true"
            aria-label="Obstacle status aanpassen"
          >
            <h3 className="text-lg font-semibold mb-2">Status aanpassen</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
              Kies de status voor <strong>{statusTarget.name}</strong>.
            </p>
            <label className="text-sm" htmlFor="status-dialog-status">Status</label>
            <select
              id="status-dialog-status"
              className="mt-1 mb-3 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white w-full"
              value={sStatus}
              onChange={(e) => setSStatus(e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            {sStatus === "problem" && (
              <>
                <label className="text-sm" htmlFor="status-dialog-problem">Probleembeschrijving</label>
                <textarea
                  id="status-dialog-problem"
                  className="mt-1 mb-3 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
                  value={sProblemDescription}
                  onChange={(e) => setSProblemDescription(e.target.value)}
                  placeholder="Beschrijf het probleem..."
                />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded border"
                disabled={sSubmitting}
                onClick={() => setStatusTarget(null)}
              >
                Annuleren
              </button>
              <button
                type="submit"
                disabled={sSubmitting}
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60 dark:bg-white dark:text-black"
              >
                {sSubmitting ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => (deleting ? null : setDeleteTarget(null))} />
          <div
            className="relative z-10 w-full max-w-md rounded-t-xl sm:rounded bg-white p-4 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            role="dialog"
            aria-modal="true"
            aria-label="Obstacle verwijderen bevestigen"
          >
            <h3 className="text-lg font-semibold mb-2">Obstacle verwijderen</h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">
              Weet je zeker dat je <strong>{deleteTarget.name}</strong> wilt verwijderen?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded border"
                disabled={deleting}
                onClick={() => setDeleteTarget(null)}
              >
                Annuleren
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded bg-red-600 text-white disabled:opacity-60"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    await onDelete(deleteTarget.id);
                    setDeleteTarget(null);
                  } catch (e: unknown) {
                    setError(getErrorMessage(e, "Verwijderen mislukt"));
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                {deleting ? "Verwijderen..." : "Verwijderen"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/80" onClick={() => setPreviewUrl(null)} />
          <div className="relative z-10 max-w-[90vw] max-h-[90vh] p-2">
            <img src={previewUrl} alt="Voorbeeld" className="max-w-full max-h-[85vh] object-contain rounded" />
            <button
              type="button"
              aria-label="Voorbeeld sluiten"
              className="absolute top-2 right-2 px-3 py-1 rounded bg-white/90 text-black shadow"
              onClick={() => setPreviewUrl(null)}
            >
              Sluiten
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
