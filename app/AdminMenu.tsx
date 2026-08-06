import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "../lib/auth";
import AdminMenuClient from "./AdminMenuClient";

type SessionUserWithRole = {
  role?: string;
};

export default async function AdminMenu() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as SessionUserWithRole | undefined)?.role;
  if (!session) return null;
  return (
    <header className="flex w-full items-center justify-between gap-4">
      <Link href="/" className="group inline-flex items-center gap-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-950 text-sm font-bold tracking-tight text-white shadow-sm transition group-hover:-rotate-3 dark:bg-white dark:text-zinc-950">MB</span>
        <span>
          <span className="block text-sm font-semibold leading-tight tracking-tight">Major Builder</span>
          <span className="block text-xs leading-tight text-zinc-500">Event operations</span>
        </span>
      </Link>
      <AdminMenuClient isAdmin={role === "admin"} />
    </header>
  );
}
