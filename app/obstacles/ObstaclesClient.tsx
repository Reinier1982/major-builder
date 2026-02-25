"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Obstacle = {
  id: number;
  name: string;
  description: string | null;
  problemDescription: string | null;
  status: string;
  order: number | null;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
};

type ObstacleImage = {
  id: number;
  obstacleId: number;
  url: string;
  label: string | null;
  uploadedBy: string | null;
};

const statuses = [
  { value: "planned", label: "Gepland" },
  { value: "in_progress", label: "Aan het opbouwen" },
  { value: "problem", label: "Probleem" },
  { value: "done", label: "Klaar" },
];

const statusLabelByValue = Object.fromEntries(statuses.map((s) => [s.value, s.label])) as Record<string, string>;

export default function ObstaclesClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "builder";
  const userId = (session?.user as any)?.id ?? null;
  const [items, setItems] = useState<Obstacle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // create dialog state
  const [showCreate, setShowCreate] = useState(false);
  const [cName, setCName] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cStatus, setCStatus] = useState("planned");
  const [cOrder, setCOrder] = useState<number | "">("");
  const [cSubmitting, setCSubmitting] = useState(false);

  // edit dialog state
  const [showEdit, setShowEdit] = useState(false);
  const [eId, setEId] = useState<number | null>(null);
  const [eName, setEName] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eProblemDescription, setEProblemDescription] = useState("");
  const [eStatus, setEStatus] = useState("planned");
  const [eOrder, setEOrder] = useState<number | "">("");
  const [eSubmitting, setESubmitting] = useState(false);
  const [eImages, setEImages] = useState<ObstacleImage[]>([]);
  const [eUploading, setEUploading] = useState(false);
  const [eNewFiles, setENewFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [adminFilter, setAdminFilter] = useState<"all" | "planned" | "in_progress" | "problem" | "done">("all");
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

  const visibleItems = useMemo(() => {
    if (adminFilter !== "all") {
      return sorted.filter((o) => o.status === adminFilter);
    }
    return sorted;
  }, [sorted, adminFilter]);

  function getNextOrderValue() {
    const numericOrders = items.map((i) => i.order).filter((v): v is number => typeof v === "number");
    if (numericOrders.length === 0) return 1;
    return Math.max(...numericOrders) + 1;
  }

  async function fetchItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/obstacles", { cache: "no-store" });
      if (!res.ok) throw new Error(`Laden mislukt (${res.status})`);
      const data = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(e.message ?? "Obstacle laden mislukt");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchItems();
  }, []);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!cName.trim()) return;
    setCSubmitting(true);
    try {
      const res = await fetch("/api/obstacles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cName.trim(),
          description: cDescription.trim() || null,
          status: cStatus,
          order: cOrder === "" ? null : Number(cOrder),
        }),
      });
      if (!res.ok) throw new Error("Aanmaken mislukt");
      const created = (await res.json()) as Obstacle;
      setItems((prev) => [...prev, created]);
      // upload images if selected
      const input: any = document.getElementById("create-images");
      const files: File[] = input?._files || [];
      if (created?.id && files.length > 0) {
        const fd = new FormData();
        for (const f of files) fd.append("image", f);
        const upRes = await fetch(`/api/obstacles/${created.id}/images`, { method: "POST", body: fd });
        if (!upRes.ok) throw new Error("Afbeelding uploaden mislukt");
      }
      // reset & close
      setShowCreate(false);
      setCName("");
      setCDescription("");
      setCStatus("planned");
      setCOrder("");
    } catch (e: any) {
      setError(e.message ?? "Obstacle aanmaken mislukt");
    } finally {
      setCSubmitting(false);
    }
  }

  async function onUpdate(id: number, patch: Partial<Obstacle>) {
    const res = await fetch(`/api/obstacles/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("Bijwerken mislukt");
    const updated = (await res.json()) as Obstacle;
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  async function fetchImages(obstacleId: number) {
    const res = await fetch(`/api/obstacles/${obstacleId}/images`, { cache: "no-store" });
    if (!res.ok) throw new Error("Afbeeldingen laden mislukt");
    const data = (await res.json()) as ObstacleImage[];
    setEImages(data);
  }

  async function onDelete(id: number) {
    const res = await fetch(`/api/obstacles/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Verwijderen mislukt");
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function onReorderByDrag(draggedId: number, targetId: number) {
    if (role !== "admin" || reordering) return;
    if (draggedId === targetId) return;

    const current = [...sorted];
    const fromIndex = current.findIndex((o) => o.id === draggedId);
    const toIndex = current.findIndex((o) => o.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...current];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);

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
          const res = await fetch(`/api/obstacles/${u.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ order: u.order }),
          });
          if (!res.ok) throw new Error("Volgorde opslaan mislukt");
        })
      );
    } catch (e: any) {
      setItems(previousItems);
      setError(e.message ?? "Volgorde opslaan mislukt");
    } finally {
      setReordering(false);
      setDraggingId(null);
      setDropTargetId(null);
    }
  }

  function obstacleIdFromPoint(clientX: number, clientY: number): number | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    const row = el?.closest?.("[data-obstacle-id]") as HTMLElement | null;
    if (!row) return null;
    const id = Number(row.dataset.obstacleId);
    return Number.isFinite(id) ? id : null;
  }

  if (loading) return <p className="text-sm text-zinc-500">Obstacle laden...</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-xl font-semibold">Obstacle overzicht</h2>
        {role === "admin" && (
        <button
          className="w-full sm:w-auto px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
          onClick={() => {
            setCName("");
            setCDescription("");
            setCStatus("planned");
            setCOrder(getNextOrderValue());
            setShowCreate(true);
          }}
        >
          Nieuwe Obstacle
        </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm">Filter</label>
        <select
          className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white text-sm"
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value as "all" | "planned" | "in_progress" | "problem" | "done")}
        >
          <option value="all">Alles</option>
          <option value="planned">Gepland</option>
          <option value="in_progress">Aan het opbouwen</option>
          <option value="problem">Probleem</option>
          <option value="done">Klaar</option>
        </select>
      </div>
      {role === "admin" && (
        <p className="text-xs text-zinc-500">Sleep via het handvat (`⋮⋮`) om de volgorde te wijzigen.</p>
      )}

      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 rounded border border-zinc-200 dark:border-zinc-800">
        {visibleItems.map((o) => (
          <li
            key={o.id}
            data-obstacle-id={o.id}
            className={`p-3 flex flex-col gap-2 touch-none ${draggingId === o.id ? "opacity-60" : ""} ${dropTargetId === o.id ? "ring-2 ring-zinc-400 ring-inset" : ""}`}
            onDragEnter={() => {
              if (role === "admin" && draggingId !== o.id && !reordering) {
                setDropTargetId(o.id);
              }
            }}
            onDragEnd={() => {
              setDraggingId(null);
              setDropTargetId(null);
            }}
            onDragOver={(ev) => {
              if (role === "admin" && !reordering) {
                ev.preventDefault();
                ev.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={async (ev) => {
              ev.preventDefault();
              const sourceId = Number(ev.dataTransfer.getData("text/plain"));
              const draggedId = Number.isFinite(sourceId) ? sourceId : draggingId;
              if (draggedId === null) return;
              await onReorderByDrag(draggedId, o.id);
            }}
            onTouchMove={(ev) => {
              if (role !== "admin" || reordering || draggingId === null) return;
              const touch = ev.touches[0];
              if (!touch) return;
              const targetId = obstacleIdFromPoint(touch.clientX, touch.clientY);
              if (targetId !== null && targetId !== draggingId) {
                setDropTargetId(targetId);
                ev.preventDefault();
              }
            }}
            onTouchEnd={async () => {
              if (role !== "admin" || reordering || draggingId === null) return;
              const draggedId = draggingId;
              const targetId = dropTargetId;
              if (targetId !== null && targetId !== draggedId) {
                await onReorderByDrag(draggedId, targetId);
              } else {
                setDraggingId(null);
                setDropTargetId(null);
              }
            }}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-zinc-500">#{o.order ?? "-"}</span>
                <strong>{o.name}</strong>
                <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-300 dark:border-zinc-700">
                  {statusLabelByValue[o.status] ?? o.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
                <button
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  onClick={() => {
                    setEId(o.id);
                    setEName(o.name);
                    setEDescription(o.description ?? "");
                    setEProblemDescription(o.problemDescription ?? "");
                    setEStatus(o.status);
                    setEOrder(o.order ?? "");
                    setShowEdit(true);
                    fetchImages(o.id).catch((e) => setError(e.message ?? "Afbeeldingen laden mislukt"));
                  }}
                >
                  Bewerken
                </button>
                {o.status !== "done" && (
                  <button
                    className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    onClick={async () => {
                      const next =
                        o.status === "planned"
                          ? "in_progress"
                          : o.status === "in_progress"
                            ? "done"
                            : o.status === "problem"
                              ? "in_progress"
                              : "planned";
                      try {
                        await onUpdate(o.id, { status: next });
                      } catch (e: any) {
                        setError(e.message ?? "Bijwerken mislukt");
                      }
                    }}
                  >
                    Volgende status
                  </button>
                )}
                {o.status === "in_progress" && (
                  <button
                    className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                    onClick={async () => {
                      try {
                        await onUpdate(o.id, { status: "problem" });
                      } catch (e: any) {
                        setError(e.message ?? "Bijwerken mislukt");
                      }
                    }}
                  >
                    Probleem
                  </button>
                )}
                {role === "admin" && (
                <button
                  className="px-1.5 py-0.5 rounded border border-red-300 text-red-700"
                  aria-label="Obstacle verwijderen"
                  title="Obstacle verwijderen"
                  onClick={() => {
                    setDeleteTarget({ id: o.id, name: o.name });
                  }}
                >
                  <span className="text-lg leading-none">🗑</span>
                </button>
                )}
              </div>
              {role === "admin" && (
                <span
                  role="button"
                  aria-label="Sleep handvat"
                  title="Sleep om te herschikken"
                  className="inline-flex items-center h-7 px-2 rounded border border-zinc-400 dark:border-zinc-600 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 cursor-grab active:cursor-grabbing select-none text-xs font-medium self-end sm:self-center sm:ml-2"
                  draggable={!reordering}
                  onDragStart={(ev) => {
                    ev.dataTransfer.effectAllowed = "move";
                    ev.dataTransfer.setData("text/plain", String(o.id));
                    setDraggingId(o.id);
                    setDropTargetId(null);
                  }}
                  onTouchStart={(ev) => {
                    if (reordering) return;
                    setDraggingId(o.id);
                    setDropTargetId(null);
                    ev.preventDefault();
                  }}
                >
                  <span className="text-sm leading-none">⋮⋮</span>
                </span>
              )}
            </div>
            {o.description && <p className="text-sm text-zinc-600 dark:text-zinc-300">{o.description}</p>}
            {o.status === "problem" && o.problemDescription && (
              <p className="text-sm text-red-700 dark:text-red-300">{o.problemDescription}</p>
            )}
          </li>
        ))}
        {visibleItems.length === 0 && (
          <li className="p-3 text-sm text-zinc-500">Nog geen Obstacle. Voeg hierboven je eerste toe.</li>
        )}
      </ul>
      {/* Create Dialog */}
      {showCreate && role === "admin" && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <form
            onSubmit={onCreate}
            className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-xl sm:rounded bg-white p-4 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold mb-3">Nieuwe Obstacle</h3>
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
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="flex flex-col">
                <label className="text-sm">Status</label>
                <select
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-900 text-white"
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
              <label className="text-sm block mb-1">Afbeeldingen</label>
              <input id="create-images" type="file" multiple accept="image/*" onChange={(ev) => {
                const files = Array.from(ev.target.files || []);
                // store on the element for later submit
                (ev.target as any)._files = files;
              }} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded border" onClick={() => setShowCreate(false)}>
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
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEdit(false)} />
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (eId === null) return;
              setESubmitting(true);
              try {
                const patch =
                  role === "admin"
                    ? {
                        name: eName,
                        description: eDescription.trim() || null,
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
              } catch (e: any) {
                setError(e.message ?? "Bijwerken mislukt");
              } finally {
                setESubmitting(false);
              }
            }}
            className="relative z-10 w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-t-xl sm:rounded bg-white p-4 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold mb-3">{role === "admin" ? "Obstacle bewerken" : "Obstacle status aanpassen"}</h3>
            <label className="text-sm">Naam</label>
            <input
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
              value={eName}
              onChange={(e) => setEName(e.target.value)}
              disabled={role !== "admin"}
              required
            />
            <label className="text-sm">Beschrijving</label>
            <textarea
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
              value={eDescription}
              onChange={(e) => setEDescription(e.target.value)}
              disabled={role !== "admin"}
            />
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="flex flex-col">
                <label className="text-sm">Status</label>
                <select
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-900 text-white"
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
                <div className="flex flex-col">
                  <label className="text-sm">Volgorde</label>
                  <input
                    className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-24"
                    type="number"
                    value={eOrder}
                    onChange={(e) => setEOrder(e.target.value === "" ? "" : Number(e.target.value))}
                  />
                </div>
              )}
            </div>
            {eStatus === "problem" && (
              <>
                <label className="text-sm">Probleembeschrijving</label>
                <textarea
                  className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
                  value={eProblemDescription}
                  onChange={(e) => setEProblemDescription(e.target.value)}
                  placeholder="Beschrijf het probleem..."
                />
              </>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded border" onClick={() => setShowEdit(false)}>
                Annuleren
              </button>
              <button
                type="submit"
                disabled={eSubmitting}
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60 dark:bg-white dark:text-black"
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
                            const res = await fetch(`/api/obstacles/${eId}/images/${img.id}`, { method: "DELETE" });
                            if (!res.ok) throw new Error("Verwijderen mislukt");
                            setEImages((prev) => prev.filter((i) => i.id !== img.id));
                          } catch (e: any) {
                            setError(e.message ?? "Afbeelding verwijderen mislukt");
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
                    <input
                      id="edit-images"
                      type="file"
                      multiple
                      accept="image/*"
                      className="sr-only"
                      onChange={(ev) => {
                        const files = Array.from(ev.target.files || []);
                        setENewFiles(files);
                      }}
                    />
                    <div className="flex flex-wrap justify-center items-center gap-2">
                      <label
                        htmlFor="edit-images"
                        className="px-3 py-2 rounded border cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      >
                        Afbeeldingen kiezen
                      </label>
                      <button
                        type="button"
                        disabled={eUploading || eNewFiles.length === 0}
                        className="px-3 py-2 rounded border"
                        onClick={async () => {
                          if (eId === null || eNewFiles.length === 0) return;
                          setEUploading(true);
                          try {
                            const fd = new FormData();
                            for (const f of eNewFiles) fd.append("image", f);
                            const res = await fetch(`/api/obstacles/${eId}/images`, { method: "POST", body: fd });
                            if (!res.ok) throw new Error("Uploaden mislukt");
                            const added = (await res.json()) as ObstacleImage[];
                            setEImages((prev) => [...prev, ...added]);
                            setENewFiles([]);
                            const input = document.getElementById("edit-images") as HTMLInputElement | null;
                            if (input) input.value = "";
                          } catch (e: any) {
                            setError(e.message ?? "Afbeeldingen uploaden mislukt");
                          } finally {
                            setEUploading(false);
                          }
                        }}
                      >
                        {eUploading ? "Uploaden..." : "Afbeelding(en) uploaden"}
                      </button>
                    </div>
                    <span className="text-sm text-zinc-500 text-center">
                      {eNewFiles.length > 0 ? `${eNewFiles.length} bestand${eNewFiles.length === 1 ? "" : "en"} geselecteerd` : "Geen bestanden geselecteerd"}
                    </span>
                  </>
                )}
              </div>
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
                  } catch (e: any) {
                    setError(e.message ?? "Verwijderen mislukt");
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
