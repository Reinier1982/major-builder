"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

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
  const [notice, setNotice] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("builder");
  const [inviting, setInviting] = useState(false);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("builder");
  const [editing, setEditing] = useState(false);

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

  useEffect(() => {
    if (!editTarget || editing) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setEditTarget(null);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editTarget, editing]);

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

  async function inviteUser(event: React.FormEvent) {
    event.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) return;
    setInviting(true);
    setError(null);
    setNotice(null);
    try {
      const email = inviteEmail.trim().toLowerCase();
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: inviteName.trim(), email, role: inviteRole }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "Gebruiker toevoegen mislukt");
      }
      const created = (await response.json()) as User;
      setUsers((prev) => (
        [...prev, created].sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email))
      ));
      setInviteName("");
      setInviteEmail("");
      setInviteRole("builder");
      setShowInvite(false);

      const result = await signIn("email", { email, redirect: false, callbackUrl: "/" });
      if (!result?.ok) {
        throw new Error(`Gebruiker is toegevoegd, maar de uitnodiging kon niet worden verstuurd: ${result?.error ?? "onbekende fout"}`);
      }
      setNotice(`Uitnodiging verstuurd naar ${email}.`);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Gebruiker uitnodigen mislukt"));
    } finally {
      setInviting(false);
    }
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

  function openEdit(user: User) {
    setError(null);
    setNotice(null);
    setEditTarget(user);
    setEditName(user.name ?? "");
    setEditRole(user.role);
  }

  async function saveEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editTarget || !editName.trim()) return;
    setEditing(true);
    setError(null);
    setNotice(null);
    try {
      await updateUser(editTarget.id, { name: editName.trim(), role: editRole });
      setNotice(`${editName.trim()} is bijgewerkt.`);
      setEditTarget(null);
    } catch (error: unknown) {
      setError(getErrorMessage(error, "Gebruiker bijwerken mislukt"));
    } finally {
      setEditing(false);
    }
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
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="flex gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"><div className="text-2xl font-semibold">{adminCount}</div><div className="text-xs text-zinc-300">beheerders</div></div>
              <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-sm"><div className="text-2xl font-semibold">{builderCount}</div><div className="text-xs text-zinc-300">bouwers</div></div>
            </div>
            <button
              type="button"
              className="min-h-11 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => {
                setError(null);
                setNotice(null);
                setShowInvite((current) => !current);
              }}
            >
              <span className="mr-2" aria-hidden="true">＋</span>Gebruiker uitnodigen
            </button>
          </div>
        </div>
      </div>
      {showInvite && (
        <form onSubmit={inviteUser} className="grid gap-4 rounded-3xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 sm:grid-cols-2 sm:p-6">
          <div className="sm:col-span-2">
            <h2 className="font-semibold tracking-tight">Nieuwe gebruiker uitnodigen</h2>
            <p className="mt-1 text-sm text-zinc-500">De gebruiker ontvangt dezelfde veilige inloglink als via de inlogpagina.</p>
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="invite-name" className="text-sm font-medium">Naam</label>
            <input
              id="invite-name"
              className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:focus:ring-zinc-800"
              value={inviteName}
              onChange={(event) => setInviteName(event.target.value)}
              placeholder="Volledige naam"
              required
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="invite-email" className="text-sm font-medium">E-mailadres</label>
            <input
              id="invite-email"
              type="email"
              className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 py-2 outline-none focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:focus:ring-zinc-800"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="naam@voorbeeld.nl"
              required
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="invite-role" className="text-sm font-medium">Rol</label>
            <select
              id="invite-role"
              className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
            >
              {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
            </select>
          </div>
          <div className="flex items-end justify-end gap-2">
            <button type="button" className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700" onClick={() => setShowInvite(false)}>Annuleren</button>
            <button type="submit" disabled={inviting} className="min-h-11 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950">
              {inviting ? "Uitnodigen..." : "Toevoegen en uitnodigen"}
            </button>
          </div>
        </form>
      )}
      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">{error}</div> : null}
      {notice ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300">{notice}</div> : null}
      <div className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/90 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4 dark:border-zinc-800">
          <div><h2 className="font-semibold tracking-tight">Teamleden</h2><p className="text-xs text-zinc-500">{users.length} gebruikers in totaal</p></div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium dark:bg-zinc-900">Actief</span>
        </div>
      <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
        {users.map((u) => (
          <li key={u.id} className="flex flex-col gap-4 p-4 transition hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-zinc-100 text-sm font-semibold uppercase text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">{(u.name || u.email).slice(0, 2)}</span>
              <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{u.name || u.email}</span>
              <span className="text-xs text-zinc-500">{u.email}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium dark:border-zinc-800 dark:bg-zinc-900">
                {roles.find((role) => role.value === u.role)?.label ?? u.role}
              </span>
              <button
                type="button"
                className="min-h-10 rounded-xl border border-zinc-300 px-3 py-2 text-sm font-medium transition hover:border-zinc-500 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
                onClick={() => openEdit(u)}
              >
                Bewerken
              </button>
              <button
                type="button"
                className="min-h-10 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                disabled={u.role === "admin" && adminCount <= 1}
                onClick={async () => {
                  if (!window.confirm(`Weet je zeker dat je ${u.name || u.email} wilt verwijderen?`)) return;
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
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-2 sm:items-center sm:p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => (editing ? null : setEditTarget(null))} />
          <form
            onSubmit={saveEdit}
            className="relative z-10 w-full max-w-lg rounded-t-2xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:rounded-2xl sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-title"
          >
            <button
              type="submit"
              aria-label="Wijzigingen opslaan"
              title="Opslaan"
              disabled={editing || !editName.trim()}
              className="absolute right-14 top-4 grid h-9 w-9 place-items-center rounded-full border border-black bg-black text-white shadow-sm transition hover:bg-zinc-800 disabled:opacity-50 dark:border-white dark:bg-white dark:text-black dark:hover:bg-zinc-200"
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
              disabled={editing}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full border border-zinc-300 text-zinc-900 transition hover:border-zinc-500 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-800"
              onClick={() => setEditTarget(null)}
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M5 5l10 10M15 5 5 15" />
              </svg>
            </button>

            <div className="pr-24">
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">Teamlid</div>
              <h2 id="edit-user-title" className="mt-1 text-xl font-semibold tracking-tight">Gebruiker bewerken</h2>
              <p className="mt-1 truncate text-sm text-zinc-500">{editTarget.email}</p>
            </div>

            <div className="mt-6 grid gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="edit-user-name" className="text-sm font-medium">Naam</label>
                <input
                  id="edit-user-name"
                  className="min-h-11 rounded-xl border border-zinc-300 bg-transparent px-3 py-2 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:focus:ring-zinc-800"
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  placeholder="Volledige naam"
                  required
                  autoFocus
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="edit-user-role" className="text-sm font-medium">Rol</label>
                <select
                  id="edit-user-role"
                  className="min-h-11 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:focus:ring-zinc-800"
                  value={editRole}
                  disabled={editTarget.role === "admin" && adminCount <= 1}
                  onChange={(event) => setEditRole(event.target.value)}
                >
                  {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                </select>
                {editTarget.role === "admin" && adminCount <= 1 && (
                  <p className="text-xs text-zinc-500">De laatste beheerder kan niet naar Bouwer worden gewijzigd.</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
              <button type="button" disabled={editing} className="min-h-11 rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium dark:border-zinc-700" onClick={() => setEditTarget(null)}>Annuleren</button>
              <button type="submit" disabled={editing || !editName.trim()} className="min-h-11 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-950">
                {editing ? "Opslaan..." : "Wijzigingen opslaan"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
