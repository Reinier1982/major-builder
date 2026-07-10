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
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto w-full max-w-3xl px-3 py-4 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:gap-6">
          <AdminMenu />
          <div>
            <h1 className="text-2xl font-semibold">Event Types</h1>
            <p className="text-sm text-zinc-500">Beheer de beschikbare typen en kaarticonen.</p>
          </div>
          <EventItemTypeManager />
        </div>
      </main>
    </div>
  );
}
