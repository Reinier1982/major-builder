import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "../../lib/auth";
import AdminMenu from "../AdminMenu";
import EventItemTypeManager from "../admin/EventItemTypeManager";

type SessionUser = { role?: string };

export default async function EventTypesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if ((session.user as SessionUser | undefined)?.role !== "admin") redirect("/");

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_#e4e4e7_0,_#fafafa_38%,_#fafafa_100%)] font-sans dark:bg-[radial-gradient(circle_at_top_left,_#27272a_0,_#09090b_38%,_#09090b_100%)]">
      <main className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        <div className="flex flex-col gap-5 sm:gap-7">
          <AdminMenu />
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-800 p-6 text-white shadow-xl shadow-zinc-950/10 sm:p-8">
            <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full border border-white/10 bg-white/5" />
            <div className="relative">
              <div className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">Configuratie</div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Event Types</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">Beheer de beschikbare typen en kaarticonen voor ieder onderdeel van het evenement.</p>
            </div>
          </div>
          <EventItemTypeManager />
        </div>
      </main>
    </div>
  );
}
