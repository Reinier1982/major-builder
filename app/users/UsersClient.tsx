"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string;
};

const roles = [
  { value: "admin", label: "Admin" },
  { value: "builder", label: "Builder" },
];

export default function UsersClient() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed (${res.status})`);
        const data = (await res.json()) as User[];
        setUsers(data);
      } catch (e: any) {
        setError(e.message ?? "Failed to load users");
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
    if (!res.ok) throw new Error("Update failed");
    const u = (await res.json()) as User;
    setUsers((prev) => prev.map((x) => (x.id === id ? u : x)));
  }

  if (loading) return <p className="text-sm text-zinc-500">Loading users…</p>;
  if (error) return <p className="text-sm text-red-600">{error}</p>;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Users</h1>
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800 rounded border border-zinc-200 dark:border-zinc-800">
        {users.map((u) => (
          <li key={u.id} className="p-3 flex items-center justify-between gap-4">
            <div className="flex flex-col">
              <span className="font-medium">{u.name ?? u.email}</span>
              <span className="text-xs text-zinc-500">{u.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-transparent"
                value={u.role}
                onChange={async (e) => {
                  try {
                    await updateUser(u.id, { role: e.target.value });
                  } catch (err: any) {
                    setError(err.message ?? "Failed to update");
                  }
                }}
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

