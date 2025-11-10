"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminMenuClient() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative ml-auto">
      <button
        type="button"
        aria-label="Open admin menu"
        className="inline-flex flex-col justify-center items-center gap-0.5 rounded border border-zinc-300 dark:border-zinc-700 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="block h-0.5 w-5 bg-black dark:bg-white" />
        <span className="block h-0.5 w-5 bg-black dark:bg-white" />
        <span className="block h-0.5 w-5 bg-black dark:bg-white" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-44 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg p-2">
            <div className="px-2 pb-2 text-xs text-zinc-500">Admin</div>
            <div className="flex flex-col">
              <Link href="/" className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setOpen(false)}>
                Home
              </Link>
              <Link href="/users" className="px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setOpen(false)}>
                Users
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

