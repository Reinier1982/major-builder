"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type ThemePreference = "dark" | "light";

export default function AdminMenuClient({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return "dark";
    try {
      return localStorage.getItem("major-builder-theme") === "light" ? "light" : "dark";
    } catch {
      return "dark";
    }
  });

  function applyTheme(preference: ThemePreference) {
    document.documentElement.dataset.theme = preference;
    document.documentElement.style.colorScheme = preference;
  }

  function changeTheme(nextTheme: ThemePreference) {
    setTheme(nextTheme);
    try {
      localStorage.setItem("major-builder-theme", nextTheme);
    } catch {}
    applyTheme(nextTheme);
  }

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
            <div className="mt-2 border-t border-zinc-200 px-2 pb-1 pt-3 dark:border-zinc-800">
              <span className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-zinc-500">Weergave</span>
              <div
                role="radiogroup"
                aria-label="Weergave kiezen"
                className="relative grid h-11 w-full grid-cols-2 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <span
                  className="absolute bottom-1 left-1 top-1 rounded-lg bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-300 ease-out dark:bg-zinc-700 dark:ring-white/10"
                  style={{
                    width: "calc((100% - 0.5rem) / 2)",
                    transform: `translateX(${theme === "light" ? 0 : 100}%)`,
                  }}
                  aria-hidden="true"
                />
                <button type="button" role="radio" aria-checked={theme === "light"} onClick={() => changeTheme("light")} className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-medium outline-none transition-colors focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 ${theme === "light" ? "text-zinc-950 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
                  </svg>
                  Licht
                </button>
                <button type="button" role="radio" aria-checked={theme === "dark"} onClick={() => changeTheme("dark")} className={`relative z-10 inline-flex items-center justify-center gap-1.5 rounded-lg pl-2 text-xs font-medium outline-none transition-colors focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-600 ${theme === "dark" ? "text-zinc-950 dark:text-white" : "text-zinc-500 dark:text-zinc-400"}`}>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z" />
                  </svg>
                  Donker
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
