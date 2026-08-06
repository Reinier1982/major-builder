"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

const roles = [
  { value: "admin", label: "Beheerder" },
  { value: "builder", label: "Bouwer" },
];

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const adminCount = users.filter((u) => u.role === "admin").length;
  const builderCount = users.filter((u) => u.role === "builder").length;

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        if (!res.ok) throw new Error(`Mislukt (${res.status})`);
        const data = (await res.json()) as User[];
        setUsers(data);
      } catch (error: unknown) {
        setError(getErrorMessage(error, "Gebruikers laden mislukt"));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function updateUser(id: string, patch: Partial<User>) {
    const res = await fetch(`/api/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Bijwerken mislukt");
    }
    const u = (await res.json()) as User;
    setUsers((prev) => prev.map((x) => (x.id === id ? u : x)));
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/users/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.error ?? "Verwijderen mislukt");
    }
    setUsers((prev) => prev.filter((x) => x.id !== id));
  }

  if (loading) return <div className="h-64 animate-pulse rounded-3xl bg-zinc-200 dark:bg-zinc-800" />;

  return (
    <section className="flex flex-col gap-5 sm:gap-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-6 text-white shadow-xl shadow-zinc-950/10 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full border border-white/10 bg-white/5" />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">Toegang & rollen</div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Gebruikers</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">Beheer wie toegang heeft en welke rol iedere gebruiker binnen de eventopbouw vervult.</p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"><div className="text-2xl font-semibold">{adminCount}</div><div className="text-xs text-zinc-300">beheerders</div></div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"><div className="text-2xl font-semibold">{builderCount}</div><div className="text-xs text-zinc-300">bouwers</div></div>
          </div>
        </div>
      </div>
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div> : null}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div><h2 className="font-semibold tracking-tight">Teamleden</h2><p className="text-xs text-zinc-500">{users.length} gebruikers in totaal</p></div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium dark:bg-zinc-900">Actief</span>
        </div>
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-4 p-4 transition hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-sm font-semibold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{(u.name ?? u.email).slice(0, 2)}</span>
              <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{u.name ?? u.email}</span>
              <span className="text-xs text-zinc-500">{u.email}</span>
              </span>
            </div>
            <div className="flex items-center gap-2 sm:justify-end">
              <select
                className="min-h-10 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-800 sm:flex-none"
                value={u.role}
                disabled={u.role === "admin" && adminCount <= 1}
                onChange={async (e) => {
                  try {
                    setError(null);
                    await updateUser(u.id, { role: e.target.value });
                  } catch (error: unknown) {
                    setError(getErrorMessage(error, "Bijwerken mislukt"));
                  }
                }}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="min-h-10 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                disabled={u.role === "admin" && adminCount <= 1}
                onClick={async () => {
                  if (!window.confirm(`Weet je zeker dat je ${u.name ?? u.email} wilt verwijderen?`)) return;
                  try {
                    setError(null);
                    await deleteUser(u.id);
                  } catch (error: unknown) {
                    setError(getErrorMessage(error, "Verwijderen mislukt"));
                  }
                }}
              >
                Verwijderen
              </button>
            </div>
          </li>
        ))}
      </ul>
      </div>
      <p className="rounded-2xl border border-zinc-200/80 bg-white/70 px-4 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60">
        Er moet altijd minimaal één gebruiker met de rol <strong>Beheerder</strong> overblijven.
      </p>
    </section>
  );
}
