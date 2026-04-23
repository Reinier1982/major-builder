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

  if (loading) return <p className="text-sm text-zinc-500">Gebruikers laden...</p>;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Gebruikers</h1>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 rounded border border-zinc-200 dark:border-zinc-800">
        {users.map((u) => (
          <li key={u.id} className="p-3 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-medium">{u.name ?? u.email}</span>
              <span className="text-xs text-zinc-500">{u.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white"
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
                className="px-3 py-1 rounded border border-red-300 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
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
      <p className="text-xs text-zinc-500">
        Er moet altijd minimaal één gebruiker met de rol <strong>Beheerder</strong> overblijven.
      </p>
    </section>
  );
}
