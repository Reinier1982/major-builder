"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type Obstacle = {
  id: number;
  name: string;
  description: string | null;
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
};

const statuses = [
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export default function ObstaclesClient() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role ?? "builder";
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
  const [eStatus, setEStatus] = useState("planned");
  const [eOrder, setEOrder] = useState<number | "">("");
  const [eSubmitting, setESubmitting] = useState(false);
  const [eImages, setEImages] = useState<ObstacleImage[]>([]);
  const [eUploading, setEUploading] = useState(false);
  const [eNewFiles, setENewFiles] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  async function fetchItems() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/obstacles", { cache: "no-store" });
      if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
      const data = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(e.message ?? "Failed to load obstacles");
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
      if (!res.ok) throw new Error("Create failed");
      const created = (await res.json()) as Obstacle;
      setItems((prev) => [...prev, created]);
      // upload images if selected
      const input: any = document.getElementById("create-images");
      const files: File[] = input?._files || [];
      if (created?.id && files.length > 0) {
        const fd = new FormData();
        for (const f of files) fd.append("image", f);
        const upRes = await fetch(`/api/obstacles/${created.id}/images`, { method: "POST", body: fd });
        if (!upRes.ok) throw new Error("Image upload failed");
      }
      // reset & close
      setShowCreate(false);
      setCName("");
      setCDescription("");
      setCStatus("planned");
      setCOrder("");
    } catch (e: any) {
      setError(e.message ?? "Failed to create obstacle");
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
    if (!res.ok) throw new Error("Update failed");
    const updated = (await res.json()) as Obstacle;
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }

  async function fetchImages(obstacleId: number) {
    const res = await fetch(`/api/obstacles/${obstacleId}/images`, { cache: "no-store" });
    if (!res.ok) throw new Error("Failed to load images");
    const data = (await res.json()) as ObstacleImage[];
    setEImages(data);
  }

  async function onDelete(id: number) {
    const res = await fetch(`/api/obstacles/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Delete failed");
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading obstacles…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex justify-between items-center">
        <h2 className="font-medium">Obstacles</h2>
        {role === "admin" && (
        <button
          className="px-3 py-2 rounded bg-black text-white dark:bg-white dark:text-black"
          onClick={() => {
            setCName("");
            setCDescription("");
            setCStatus("planned");
            setCOrder("");
            setShowCreate(true);
          }}
        >
          New Obstacle
        </button>
        )}
      </div>

      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 rounded border border-zinc-200 dark:border-zinc-800">
        {sorted.map((o) => (
          <li key={o.id} className="p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">#{o.order ?? "-"}</span>
                <strong>{o.name}</strong>
                <span className="text-xs px-2 py-0.5 rounded-full border border-zinc-300 dark:border-zinc-700">
                  {o.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  onClick={() => {
                    setEId(o.id);
                    setEName(o.name);
                    setEDescription(o.description ?? "");
                    setEStatus(o.status);
                    setEOrder(o.order ?? "");
                    setShowEdit(true);
                    fetchImages(o.id).catch((e) => setError(e.message ?? "Failed to load images"));
                  }}
                >
                  Edit
                </button>
                <button
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700"
                  onClick={async () => {
                    const next = o.status === "planned" ? "in_progress" : o.status === "in_progress" ? "done" : "planned";
                    try {
                      await onUpdate(o.id, { status: next });
                    } catch (e: any) {
                      setError(e.message ?? "Failed to update");
                    }
                  }}
                >
                  Advance Status
                </button>
                {role === "admin" && (
                <button
                  className="px-2 py-1 rounded border border-red-300 text-red-700"
                  onClick={async () => {
                    if (!confirm(`Delete ${o.name}?`)) return;
                    try {
                      await onDelete(o.id);
                    } catch (e: any) {
                      setError(e.message ?? "Failed to delete");
                    }
                  }}
                >
                  Delete
                </button>
                )}
              </div>
            </div>
            {o.description && <p className="text-sm text-zinc-600 dark:text-zinc-300">{o.description}</p>}
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="p-3 text-sm text-zinc-500">No obstacles yet. Add your first one above.</li>
        )}
      </ul>
      {/* Create Dialog */}
      {showCreate && role === "admin" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCreate(false)} />
          <form
            onSubmit={onCreate}
            className="relative z-10 w-full max-w-lg rounded bg-white p-4 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold mb-3">New Obstacle</h3>
            <label className="text-sm">Name</label>
            <input
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
              placeholder="e.g. Monkey Bars"
              required
            />
            <label className="text-sm">Description</label>
            <textarea
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
              value={cDescription}
              onChange={(e) => setCDescription(e.target.value)}
              placeholder="Materials, dimensions, notes…"
            />
            <div className="flex gap-3 mb-3">
              <div className="flex flex-col">
                <label className="text-sm">Status</label>
                <select
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
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
                <label className="text-sm">Order</label>
                <input
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-24"
                  type="number"
                  value={cOrder}
                  onChange={(e) => setCOrder(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="e.g. 1"
                />
              </div>
            </div>
            <div className="mb-3">
              <label className="text-sm block mb-1">Images</label>
              <input id="create-images" type="file" multiple accept="image/*" onChange={(ev) => {
                const files = Array.from(ev.target.files || []);
                // store on the element for later submit
                (ev.target as any)._files = files;
              }} />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded border" onClick={() => setShowCreate(false)}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={cSubmitting}
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60 dark:bg-white dark:text-black"
              >
                {cSubmitting ? "Creating…" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Dialog */}
      {showEdit && eId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowEdit(false)} />
          <form
            onSubmit={async (ev) => {
              ev.preventDefault();
              if (eId === null) return;
              setESubmitting(true);
              try {
                await onUpdate(eId, {
                  name: eName,
                  description: eDescription.trim() || null,
                  status: eStatus,
                  order: eOrder === "" ? null : Number(eOrder),
                });
                setShowEdit(false);
              } catch (e: any) {
                setError(e.message ?? "Failed to update");
              } finally {
                setESubmitting(false);
              }
            }}
            className="relative z-10 w-full max-w-lg rounded bg-white p-4 shadow-xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700"
            role="dialog"
            aria-modal="true"
          >
            <h3 className="text-lg font-semibold mb-3">{role === "admin" ? "Edit Obstacle" : "View Obstacle"}</h3>
            <label className="text-sm">Name</label>
            <input
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
              value={eName}
              onChange={(e) => setEName(e.target.value)}
              disabled={role !== "admin"}
              required
            />
            <label className="text-sm">Description</label>
            <textarea
              className="mb-2 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-full"
              value={eDescription}
              onChange={(e) => setEDescription(e.target.value)}
              disabled={role !== "admin"}
            />
            <div className="flex gap-3 mb-3">
              <div className="flex flex-col">
                <label className="text-sm">Status</label>
                <select
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
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
              <div className="flex flex-col">
                <label className="text-sm">Order</label>
                <input
                  className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent w-24"
                  type="number"
                  value={eOrder}
                  onChange={(e) => setEOrder(e.target.value === "" ? "" : Number(e.target.value))}
                  disabled={role !== "admin"}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className="px-3 py-2 rounded border" onClick={() => setShowEdit(false)}>
                Cancel
              </button>
              {role === "admin" && (
              <button
                type="submit"
                disabled={eSubmitting}
                className="px-3 py-2 rounded bg-black text-white disabled:opacity-60 dark:bg-white dark:text-black"
              >
                {eSubmitting ? "Saving…" : "Save"}
              </button>
              )}
            </div>

            {/* Images section */}
            <div className="mt-4 border-t pt-3">
              <h4 className="font-medium mb-2">Images</h4>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {eImages.map((img) => (
                  <div key={img.id} className="relative group border rounded overflow-hidden">
                    <img
                      src={img.url}
                      alt={img.label ?? "Obstacle image"}
                      className="w-full h-24 object-cover cursor-zoom-in"
                      onClick={() => setPreviewUrl(img.url)}
                    />
                    <button
                      type="button"
                      className="absolute top-1 right-1 px-2 py-1 text-xs rounded bg-black/70 text-white hidden group-hover:block"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/obstacles/${eId}/images/${img.id}`, { method: "DELETE" });
                          if (!res.ok) throw new Error("Delete failed");
                          setEImages((prev) => prev.filter((i) => i.id !== img.id));
                        } catch (e: any) {
                          setError(e.message ?? "Failed to delete image");
                        }
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {eImages.length === 0 && <p className="col-span-3 text-sm text-zinc-500">No images yet.</p>}
              </div>

              <div className="flex items-center gap-2">
                {role === "admin" && (
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(ev) => {
                    const files = Array.from(ev.target.files || []);
                    setENewFiles(files);
                  }}
                />
                )}
                {role === "admin" && (
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
                      if (!res.ok) throw new Error("Upload failed");
                      const added = (await res.json()) as ObstacleImage[];
                      setEImages((prev) => [...prev, ...added]);
                      setENewFiles([]);
                    } catch (e: any) {
                      setError(e.message ?? "Failed to upload images");
                    } finally {
                      setEUploading(false);
                    }
                  }}
                >
                  {eUploading ? "Uploading…" : "Upload Selected"}
                </button>
                )}
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/80" onClick={() => setPreviewUrl(null)} />
          <div className="relative z-10 max-w-[90vw] max-h-[90vh] p-2">
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded" />
            <button
              type="button"
              aria-label="Close preview"
              className="absolute top-2 right-2 px-3 py-1 rounded bg-white/90 text-black shadow"
              onClick={() => setPreviewUrl(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </section>
  );
}
