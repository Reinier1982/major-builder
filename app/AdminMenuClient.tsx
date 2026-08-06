"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminMenuClient({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Open adminmenu"
        className="inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 rounded-xl border border-zinc-200 bg-white p-2.5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="block h-0.5 w-6 bg-black dark:bg-white" />
        <span className="block h-0.5 w-6 bg-black dark:bg-white" />
        <span className="block h-0.5 w-6 bg-black dark:bg-white" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-52 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-950/10 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Navigatie</div>
            <nav className="flex flex-col gap-1">
              {isAdmin && (
                <Link href="/admin" className="rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => setOpen(false)}>
                  Dashboard
                </Link>
              )}
              <Link href="/" className="rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => setOpen(false)}>
                Obstacles
              </Link>
              <Link href="/map" className="rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => setOpen(false)}>
                Plattegrond
              </Link>
              {isAdmin && (
                <Link href="/users" className="rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => setOpen(false)}>
                  Gebruikers
                </Link>
              )}
              {isAdmin && (
                <Link href="/event-types" className="rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:hover:bg-zinc-900" onClick={() => setOpen(false)}>
                  Event Types
                </Link>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  );
}
